#!/usr/bin/env python3
"""Paired evaluation run comparison for agent-builder evals.
"""

from __future__ import annotations

import argparse
import json
import math
import os
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path
from typing import Any

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
from elasticsearch import Elasticsearch
from scipy import stats

from chart_style import save_figure, setup_style, short_label, sig_color

INDEX_ALIAS = "kibana-evaluations"

# Test-selection categories: determines which statistical test runs.
# "Numeric" = Wilcoxon + r_rb, "Binary" = McNemar + OR, "Excluded" = skip.
TEST_CATEGORY_NUMERIC = "Numeric"
TEST_CATEGORY_BINARY = "Binary"
TEST_CATEGORY_EXCLUDED = "Excluded"
TESTABLE_CATEGORIES = {TEST_CATEGORY_NUMERIC, TEST_CATEGORY_BINARY}


@dataclass
class MetricResult:
    baseline_run_id: str
    variant_run_id: str
    dataset_id: str
    dataset_name: str
    evaluator_name: str
    family: str
    n: int
    baseline_mean: float
    variant_mean: float
    baseline_median: float
    variant_median: float
    diff_mean: float
    diff_ci_lower: float | None
    diff_ci_upper: float | None
    primary_test: str
    raw_p: float | None
    holm_p: float | None
    significant: bool | None
    effect_type: str | None
    effect_value: float | None
    effect_magnitude: str | None
    notes: str


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Analyze paired eval runs.")
    parser.add_argument("output_base_dir")
    parser.add_argument("es_url")
    parser.add_argument("baseline_run_id")
    parser.add_argument("variant_run_ids", nargs="+")
    parser.add_argument("--alpha", type=float, default=0.05)
    parser.add_argument("--bootstrap", type=int, default=10000)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument(
        "--label",
        action="append",
        default=[],
        metavar="RUN_ID=DISPLAY_NAME",
        help="Human-readable label for a run ID (repeatable). Falls back to first 8 chars of run ID.",
    )
    return parser.parse_args()


def parse_json_string_map_env(env_name: str) -> dict[str, str]:
    value = os.environ.get(env_name, "").strip()
    if not value:
        return {}
    try:
        obj = json.loads(value)
    except json.JSONDecodeError:
        print(f"[warn] could not parse {env_name}; expected JSON object")
        return {}
    if not isinstance(obj, dict):
        print(f"[warn] could not parse {env_name}; expected JSON object")
        return {}

    parsed: dict[str, str] = {}
    for k, v in obj.items():
        if not isinstance(k, str) or not isinstance(v, str):
            continue
        key = k.strip()
        value = v.strip()
        if key and value:
            parsed[key] = value
    return parsed


def parse_display_label_overrides_env() -> dict[str, str]:
    """Display-only overrides for metric families shown in tables/charts."""
    return parse_json_string_map_env("EVAL_METRIC_DISPLAY_LABEL_MAP_JSON")


def normalize_test_category(value: str) -> str | None:
    normalized = value.strip().lower()
    if normalized == "numeric":
        return TEST_CATEGORY_NUMERIC
    if normalized == "binary":
        return TEST_CATEGORY_BINARY
    if normalized in {"excluded", "exclude", "skip"}:
        return TEST_CATEGORY_EXCLUDED
    return None


def parse_test_category_overrides_env() -> dict[str, str]:
    """Inference overrides for metric test selection (Numeric/Binary/Excluded)."""
    raw_overrides = parse_json_string_map_env("EVAL_METRIC_TEST_CATEGORY_MAP_JSON")
    category_overrides: dict[str, str] = {}
    for evaluator_name, raw_category in raw_overrides.items():
        category = normalize_test_category(raw_category)
        if category is None:
            print(
                f"[warn] invalid test category override for '{evaluator_name}': '{raw_category}' "
                "(expected Numeric, Binary, or Excluded)"
            )
            continue
        category_overrides[evaluator_name] = category
    return category_overrides


def parse_exclusions_env() -> set[str]:
    value = os.environ.get("EVAL_EXCLUDE_EVALUATORS", "")
    return {x.strip() for x in value.split(",") if x.strip()}


def build_label_map(label_args: list[str], all_run_ids: list[str]) -> dict[str, str]:
    """Build run_id -> display_label mapping from --label flags, with 8-char fallback."""
    labels: dict[str, str] = {}
    for entry in label_args:
        if "=" not in entry:
            continue
        run_id, name = entry.split("=", 1)
        run_id = run_id.strip()
        name = name.strip()
        if run_id and name:
            labels[run_id] = name
    for rid in all_run_ids:
        if rid not in labels:
            labels[rid] = rid[:8]
    return labels


def display_label(run_id: str, label_map: dict[str, str]) -> str:
    return label_map.get(run_id, run_id[:8])


def fetch_run_docs(es: Elasticsearch, run_id: str, page_size: int = 2000) -> tuple[list[dict[str, Any]], int, int]:
    count_resp = es.count(index=INDEX_ALIAS, query={"term": {"run_id": run_id}})
    total = int(count_resp.get("count", 0))
    if total == 0:
        raise RuntimeError(
            f"No scores found for run ID '{run_id}'. Verify run ID and ES cluster."
        )

    pit = es.open_point_in_time(index=INDEX_ALIAS, keep_alive="2m")
    pit_id = pit["id"]
    docs: list[dict[str, Any]] = []
    pages = 0
    search_after: list[Any] | None = None

    try:
        while True:
            body: dict[str, Any] = {
                "size": page_size,
                "pit": {"id": pit_id, "keep_alive": "2m"},
                "query": {"term": {"run_id": run_id}},
                "sort": [{"_shard_doc": "asc"}],
            }
            if search_after is not None:
                body["search_after"] = search_after

            resp = es.search(body=body)
            hits = resp.get("hits", {}).get("hits", [])
            if not hits:
                break

            pages += 1
            for hit in hits:
                src = hit.get("_source")
                if src is not None:
                    docs.append(src)

            search_after = hits[-1].get("sort")
            if len(hits) < page_size:
                break
    finally:
        try:
            es.close_point_in_time(body={"id": pit_id})
        except Exception:
            pass

    return docs, total, pages


def source_rows(docs: list[dict[str, Any]]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for src in docs:
        example = src.get("example", {}) or {}
        dataset = example.get("dataset", {}) or {}
        evaluator = src.get("evaluator", {}) or {}
        task = src.get("task", {}) or {}
        rows.append(
            {
                "run_id": src.get("run_id"),
                "dataset_id": dataset.get("id", "unknown"),
                "dataset_name": dataset.get("name", dataset.get("id", "unknown")),
                "example_id": example.get("id"),
                "evaluator_name": evaluator.get("name"),
                "repetition_index": task.get("repetition_index", 0),
                "score_raw": evaluator.get("score"),
            }
        )
    return rows


# Evaluator name -> (display_label, test_category).
KNOWN_METRICS: dict[str, tuple[str, str]] = {
    "Factuality": ("LLM Quality", TEST_CATEGORY_NUMERIC),
    "Relevance": ("LLM Quality", TEST_CATEGORY_NUMERIC),
    "Sequence Accuracy": ("LLM Quality", TEST_CATEGORY_NUMERIC),
    "Groundedness": ("LLM Quality", TEST_CATEGORY_NUMERIC),
    "Input Tokens": ("Efficiency", TEST_CATEGORY_NUMERIC),
    "Output Tokens": ("Efficiency", TEST_CATEGORY_NUMERIC),
    "Cached Tokens": ("Efficiency", TEST_CATEGORY_NUMERIC),
    "Tool Calls": ("Efficiency", TEST_CATEGORY_NUMERIC),
    "Latency": ("Latency", TEST_CATEGORY_NUMERIC),
    "ToolUsageOnly": ("Binary", TEST_CATEGORY_BINARY),
    "DocVersionReleaseDate": ("Binary", TEST_CATEGORY_BINARY),
    "ES|QL Functional Equivalence": ("Binary", TEST_CATEGORY_BINARY),
    "correctness": ("Excluded", TEST_CATEGORY_EXCLUDED),
    "Groundedness Analysis": ("Excluded", TEST_CATEGORY_EXCLUDED),
    "Correctness Analysis": ("Excluded", TEST_CATEGORY_EXCLUDED),
    "criteria": ("Excluded", TEST_CATEGORY_EXCLUDED),
}

def classify_metric(evaluator_name: str) -> tuple[str, str]:
    """Returns (display_label, test_category) for a metric."""
    if evaluator_name in KNOWN_METRICS:
        return KNOWN_METRICS[evaluator_name]
    if evaluator_name.lower().startswith(("precision@", "recall@", "f1@")):
        return ("RAG", TEST_CATEGORY_NUMERIC)
    return ("Unknown", TEST_CATEGORY_EXCLUDED)


def assign_families(
    df: pd.DataFrame,
    display_override_map: dict[str, str],
    category_override_map: dict[str, str],
    exclusions: set[str],
) -> tuple[dict[str, str], dict[str, str]]:
    """Returns (family_map for display, category_map for test selection)."""
    family_map: dict[str, str] = {}
    category_map: dict[str, str] = {}
    for evaluator_name in df["evaluator_name"].dropna().unique():
        if not isinstance(evaluator_name, str):
            continue
        label, cat = classify_metric(evaluator_name)
        if evaluator_name in exclusions:
            family_map[evaluator_name] = "Excluded"
            category_map[evaluator_name] = TEST_CATEGORY_EXCLUDED
        else:
            family_map[evaluator_name] = display_override_map.get(evaluator_name, label)
            category_map[evaluator_name] = category_override_map.get(evaluator_name, cat)
    return family_map, category_map


def aggregate_repetitions(df: pd.DataFrame) -> tuple[pd.DataFrame, int]:
    grouped = df.groupby(
        ["run_id", "dataset_id", "dataset_name", "example_id", "evaluator_name", "family", "test_category"],
        dropna=False,
        as_index=False,
    )
    rows: list[dict[str, Any]] = []
    ambiguous_binary_ties = 0

    for _, g in grouped:
        cat = g.iloc[0]["test_category"]
        scores = g["score"].dropna()
        if scores.empty or cat == TEST_CATEGORY_EXCLUDED:
            continue
        if cat == TEST_CATEGORY_BINARY:
            m = float(scores.mean())
            if m > 0.5:
                agg_score = 1.0
            elif m < 0.5:
                agg_score = 0.0
            else:
                ambiguous_binary_ties += 1
                continue
        else:
            agg_score = float(scores.mean())
        rows.append(
            {
                "run_id": g.iloc[0]["run_id"],
                "dataset_id": g.iloc[0]["dataset_id"],
                "dataset_name": g.iloc[0]["dataset_name"],
                "example_id": g.iloc[0]["example_id"],
                "evaluator_name": g.iloc[0]["evaluator_name"],
                "family": g.iloc[0]["family"],
                "test_category": cat,
                "score": agg_score,
            }
        )
    return pd.DataFrame(rows), ambiguous_binary_ties


def pair_variant(agg_df: pd.DataFrame, baseline_run_id: str, variant_run_id: str) -> tuple[pd.DataFrame, dict[str, int]]:
    # Pair on contract key; keep baseline metadata for reporting.
    pair_key_cols = ["dataset_id", "example_id", "evaluator_name"]
    base = agg_df.loc[
        agg_df["run_id"] == baseline_run_id,
        pair_key_cols + ["dataset_name", "family", "test_category", "score"],
    ].copy()
    base = base.rename(columns={"score": "score_baseline"})
    var = agg_df.loc[agg_df["run_id"] == variant_run_id, pair_key_cols + ["score"]].copy()
    var = var.rename(columns={"score": "score_variant"})
    base_dupes = int(base.duplicated(subset=pair_key_cols, keep=False).sum())
    var_dupes = int(var.duplicated(subset=pair_key_cols, keep=False).sum())
    if base_dupes > 0 or var_dupes > 0:
        raise RuntimeError(
            f"Non-unique pairing keys for variant '{variant_run_id}' "
            f"(baseline duplicates={base_dupes}, variant duplicates={var_dupes})"
        )

    base_keys = set(tuple(x) for x in base[pair_key_cols].itertuples(index=False, name=None))
    var_keys = set(tuple(x) for x in var[pair_key_cols].itertuples(index=False, name=None))
    merged = base.merge(var, on=pair_key_cols, how="inner")
    stats_dict = {
        "valid_pairs": int(len(merged)),
        "missing_pairs": int(len(base_keys.symmetric_difference(var_keys))),
        "missing_from_variant": int(len(base_keys - var_keys)),
        "missing_from_baseline": int(len(var_keys - base_keys)),
    }
    return merged, stats_dict


def bootstrap_ci_mean(values: np.ndarray, n_bootstrap: int, seed: int) -> tuple[float, float]:
    rng = np.random.default_rng(seed)
    n = len(values)
    boot = np.array([np.mean(rng.choice(values, size=n, replace=True)) for _ in range(n_bootstrap)])
    return float(np.percentile(boot, 2.5)), float(np.percentile(boot, 97.5))


def rank_biserial(differences: np.ndarray) -> float:
    nonzero = differences[differences != 0]
    if len(nonzero) == 0:
        return 0.0
    ranks = stats.rankdata(np.abs(nonzero))
    w_plus = float(np.sum(ranks[nonzero > 0]))
    w_minus = float(np.sum(ranks[nonzero < 0]))
    denom = w_plus + w_minus
    if denom <= 0:
        return 0.0
    return (w_plus - w_minus) / denom


def magnitude_rrb(value: float) -> str:
    v = abs(value)
    if v < 0.1:
        return "negligible"
    if v < 0.3:
        return "small"
    if v < 0.5:
        return "medium"
    return "large"


def magnitude_or(value: float) -> str:
    mag = max(value, 1.0 / value) if value > 0 else float("inf")
    if mag < 1.5:
        return "negligible"
    if mag < 2.5:
        return "small"
    if mag < 4.3:
        return "medium"
    return "large"


def compute_result(
    group: pd.DataFrame,
    baseline_run_id: str,
    variant_run_id: str,
    n_bootstrap: int,
    seed: int,
) -> MetricResult:
    dataset_id = str(group.iloc[0]["dataset_id"])
    dataset_name = str(group.iloc[0]["dataset_name"])
    evaluator_name = str(group.iloc[0]["evaluator_name"])
    family = str(group.iloc[0]["family"])
    test_category = str(group.iloc[0]["test_category"])
    baseline = group["score_baseline"].to_numpy(dtype=float)
    variant = group["score_variant"].to_numpy(dtype=float)
    differences = baseline - variant
    n = len(group)

    res = MetricResult(
        baseline_run_id=baseline_run_id,
        variant_run_id=variant_run_id,
        dataset_id=dataset_id,
        dataset_name=dataset_name,
        evaluator_name=evaluator_name,
        family=family,
        n=n,
        baseline_mean=float(np.mean(baseline)) if n else float("nan"),
        variant_mean=float(np.mean(variant)) if n else float("nan"),
        baseline_median=float(np.median(baseline)) if n else float("nan"),
        variant_median=float(np.median(variant)) if n else float("nan"),
        diff_mean=float(np.mean(differences)) if n else float("nan"),
        diff_ci_lower=None,
        diff_ci_upper=None,
        primary_test="n/a",
        raw_p=None,
        holm_p=None,
        significant=None,
        effect_type=None,
        effect_value=None,
        effect_magnitude=None,
        notes="",
    )

    if test_category == TEST_CATEGORY_EXCLUDED:
        res.notes = "excluded"
        return res
    if n < 2:
        res.notes = "insufficient data (N < 2)"
        return res
    if n < 6:
        res.notes = f"N={n} too small for reliable testing (need >= 6)"
        return res

    if test_category == TEST_CATEGORY_BINARY:
        b = int(np.sum((baseline == 0) & (variant == 1)))
        c = int(np.sum((baseline == 1) & (variant == 0)))
        discordant = b + c
        if discordant == 0:
            raw_p = 1.0
        else:
            raw_p = float(stats.binomtest(min(b, c), n=discordant, p=0.5, alternative="two-sided").pvalue)
        or_value = (c + 0.5) / (b + 0.5)
        res.primary_test = "Exact McNemar"
        res.raw_p = raw_p
        res.effect_type = "OR"
        res.effect_value = float(or_value)
        res.effect_magnitude = magnitude_or(or_value)
        res.notes = f"discordant baseline>variant={c}, variant>baseline={b}"
        return res

    # Numeric metrics: Wilcoxon + rank-biserial.
    ci_low, ci_high = bootstrap_ci_mean(differences, n_bootstrap=n_bootstrap, seed=seed)
    res.diff_ci_lower = ci_low
    res.diff_ci_upper = ci_high

    res.primary_test = "Wilcoxon signed-rank"
    if np.allclose(differences, 0.0):
        raw_p = 1.0
    else:
        try:
            raw_p = float(stats.wilcoxon(differences, alternative="two-sided").pvalue)
        except ValueError:
            raw_p = 1.0
    effect = rank_biserial(differences)
    res.raw_p = raw_p
    res.effect_type = "r_rb"
    res.effect_value = float(effect)
    res.effect_magnitude = magnitude_rrb(effect)

    tie_fraction = float(np.mean(differences == 0))
    notes = []
    if tie_fraction > 0.5:
        notes.append(f"high tie fraction ({tie_fraction:.1%})")
    res.notes = "; ".join(notes)
    return res


def apply_holm(results_df: pd.DataFrame, alpha: float) -> pd.DataFrame:
    results_df = results_df.copy()
    results_df["holm_p"] = np.nan
    results_df["significant"] = None
    for _, sub in results_df.groupby(["dataset_id", "variant_run_id"]):
        valid = sub[sub["raw_p"].notna()]
        if valid.empty:
            continue
        pvals = valid["raw_p"].astype(float).to_numpy()
        order = np.argsort(pvals)
        m = len(pvals)

        adjusted = np.zeros(m, dtype=float)
        for rank, pos in enumerate(order, start=1):
            adjusted[pos] = min(1.0, pvals[pos] * (m - rank + 1))

        running_max = 0.0
        for pos in order:
            running_max = max(running_max, adjusted[pos])
            adjusted[pos] = running_max

        for i, row_idx in enumerate(valid.index):
            holm = float(adjusted[i])
            results_df.at[row_idx, "holm_p"] = holm
            results_df.at[row_idx, "significant"] = bool(holm < alpha)

    return results_df


def fmt_float(v: Any, digits: int = 4) -> str:
    if v is None or (isinstance(v, float) and (np.isnan(v) or np.isinf(v))):
        return "n/a"
    return f"{float(v):.{digits}f}"


def result_table_markdown(sub: pd.DataFrame) -> str:
    lines = [
        "| Metric | Family | N | Baseline Mean | Variant Mean | Diff | 95% CI | Primary Test | Raw p | Holm p | Effect | Magnitude | Sig | Notes |",
        "|---|---|---:|---:|---:|---:|---|---|---:|---:|---|---|---|---|",
    ]
    for _, r in sub.iterrows():
        if r["effect_type"] == "OR" and pd.notna(r["effect_value"]):
            effect_text = f"OR={float(r['effect_value']):.3f}"
        elif pd.notna(r["effect_value"]):
            effect_text = f"r_rb={float(r['effect_value']):.3f}"
        else:
            effect_text = "n/a"
        if pd.isna(r["holm_p"]):
            sig = "n/a"
        else:
            sig = "pass" if bool(r["significant"]) else "fail"
        ci = (
            f"[{fmt_float(r['diff_ci_lower'])}, {fmt_float(r['diff_ci_upper'])}]"
            if pd.notna(r["diff_ci_lower"])
            else "n/a"
        )
        lines.append(
            "| "
            + " | ".join(
                [
                    str(r["evaluator_name"]),
                    str(r["family"]),
                    str(int(r["n"])),
                    fmt_float(r["baseline_mean"]),
                    fmt_float(r["variant_mean"]),
                    fmt_float(r["diff_mean"]),
                    ci,
                    str(r["primary_test"]),
                    fmt_float(r["raw_p"]),
                    fmt_float(r["holm_p"]),
                    effect_text,
                    str(r["effect_magnitude"] if pd.notna(r["effect_magnitude"]) else "n/a"),
                    sig,
                    str(r["notes"] or ""),
                ]
            )
            + " |"
        )
    return "\n".join(lines)


def write_summary(
    results_df: pd.DataFrame,
    output_dir: Path,
    label_map: dict[str, str] | None = None,
    alpha: float = 0.05,
) -> str:
    label_map = label_map or {}
    baseline_ids = results_df["baseline_run_id"].unique()
    baseline_label = display_label(baseline_ids[0], label_map) if len(baseline_ids) > 0 else "Baseline"

    chunks: list[str] = []
    tested = results_df["raw_p"].notna().sum()
    sig_count = ((results_df["holm_p"].notna()) & (results_df["holm_p"] < alpha)).sum()
    chunks.append(
        f"**Significant differences (Holm-corrected, alpha={alpha:g}, primary tests only):** {sig_count} out of {tested} tested metrics across all datasets and variants"
    )
    for variant_id in sorted(results_df["variant_run_id"].unique()):
        variant_label = display_label(variant_id, label_map)
        chunks.append("")
        chunks.append(f"### Variant: `{variant_label}` vs `{baseline_label}`")
        var_df = results_df[results_df["variant_run_id"] == variant_id]
        for dataset_name in sorted(var_df["dataset_name"].unique()):
            chunks.append("")
            chunks.append(f"#### Dataset: `{dataset_name}`")
            sub = var_df[var_df["dataset_name"] == dataset_name].sort_values("evaluator_name")
            chunks.append(result_table_markdown(sub))
    text = "\n".join(chunks).strip() + "\n"
    (output_dir / "summary.md").write_text(text)
    return text


def effect_forest(results_df: pd.DataFrame, output_dir: Path, label_map: dict[str, str] | None = None) -> list[Path]:
    label_map = label_map or {}
    files: list[Path] = []
    for (variant_id, dataset_name), sub in results_df.groupby(["variant_run_id", "dataset_name"]):
        plotted = sub[sub["effect_value"].notna() & sub["raw_p"].notna()].copy()
        if plotted.empty:
            continue
        variant_label = display_label(variant_id, label_map)
        baseline_ids = sub["baseline_run_id"].unique()
        baseline_label = display_label(baseline_ids[0], label_map) if len(baseline_ids) > 0 else "baseline"

        numeric = plotted[plotted["effect_type"] == "r_rb"].sort_values("evaluator_name")
        binary = plotted[plotted["effect_type"] == "OR"].sort_values("evaluator_name")

        nrows = 1 + (0 if binary.empty else 1)
        fig, axes = plt.subplots(nrows=nrows, ncols=1, figsize=(10, 2.4 + 0.5 * len(plotted)))
        if nrows == 1:
            axes = [axes]
        ax_num = axes[0]
        if not numeric.empty:
            y = np.arange(len(numeric))
            colors = [sig_color(bool(v)) for v in numeric["significant"].infer_objects(copy=False).fillna(False)]
            ax_num.scatter(numeric["effect_value"], y, c=colors, s=40)
            ax_num.axvline(0.0, color="#666666", linestyle="--", linewidth=1)
            ax_num.set_yticks(y)
            ax_num.set_yticklabels([short_label(x, 28) for x in numeric["evaluator_name"]])
            ax_num.set_xlabel("Rank-biserial effect size (r_rb)")
            ax_num.set_title(f"{dataset_name}: {short_label(variant_label, 28)} vs {short_label(baseline_label, 28)}")
        else:
            ax_num.text(0.5, 0.5, "No numeric metrics", ha="center", va="center", transform=ax_num.transAxes)
            ax_num.set_axis_off()

        if not binary.empty:
            ax_bin = axes[1]
            yb = np.arange(len(binary))
            colors = [sig_color(bool(v)) for v in binary["significant"].infer_objects(copy=False).fillna(False)]
            ax_bin.scatter(binary["effect_value"], yb, c=colors, s=40)
            ax_bin.set_xscale("log")
            ax_bin.axvline(1.0, color="#666666", linestyle="--", linewidth=1)
            ax_bin.set_yticks(yb)
            ax_bin.set_yticklabels([short_label(x, 28) for x in binary["evaluator_name"]])
            ax_bin.set_xlabel("Odds ratio (baseline over variant)")
            ax_bin.set_title("Binary metrics")

        out = output_dir / f"effect_forest_{dataset_name.replace(' ', '_')}_{short_label(variant_id,12).replace('…','')}.png"
        save_figure(fig, out)
        files.append(out)
    return files


def box_plots(agg_df: pd.DataFrame, output_dir: Path, label_map: dict[str, str] | None = None) -> list[Path]:
    label_map = label_map or {}
    files: list[Path] = []
    plot_df = agg_df[agg_df["test_category"].isin(TESTABLE_CATEGORIES)].copy()
    if plot_df.empty:
        return files
    plot_df["display_label"] = plot_df["run_id"].map(lambda rid: display_label(rid, label_map))
    for dataset_name, ds in plot_df.groupby("dataset_name"):
        metrics = sorted(ds["evaluator_name"].unique())
        if not metrics:
            continue
        ncols = min(4, max(1, len(metrics)))
        nrows = int(math.ceil(len(metrics) / ncols))
        fig, axes = plt.subplots(nrows=nrows, ncols=ncols, figsize=(4 * ncols, 2.8 * nrows))
        axes_arr = np.array(axes).reshape(-1)
        n_groups = ds["display_label"].nunique()
        palette = list(sns.color_palette("colorblind", n_colors=n_groups))
        for i, metric in enumerate(metrics):
            ax = axes_arr[i]
            mdf = ds[ds["evaluator_name"] == metric]
            sns.boxplot(data=mdf, x="display_label", y="score", hue="display_label", ax=ax, palette=palette, legend=False)
            ax.set_title(short_label(metric, 24))
            ax.set_xlabel("")
            ax.set_ylabel("score")
            ax.tick_params(axis="x", rotation=30)
        for j in range(len(metrics), len(axes_arr)):
            axes_arr[j].set_axis_off()
        fig.suptitle(f"Score distributions — {dataset_name}", y=1.02)
        out = output_dir / f"box_plots_{dataset_name.replace(' ', '_')}.png"
        save_figure(fig, out)
        files.append(out)
    return files


def pvalue_heatmap(results_df: pd.DataFrame, output_dir: Path, label_map: dict[str, str] | None = None) -> list[Path]:
    label_map = label_map or {}
    files: list[Path] = []
    if results_df["variant_run_id"].nunique() < 2:
        return files
    for dataset_name, ds in results_df.groupby("dataset_name"):
        ds = ds.copy()
        ds["variant_label"] = ds["variant_run_id"].map(lambda rid: display_label(rid, label_map))
        piv = ds.pivot_table(
            index="evaluator_name",
            columns="variant_label",
            values="holm_p",
            aggfunc="first",
        )
        if piv.empty:
            continue
        fig, ax = plt.subplots(figsize=(2 + 1.4 * len(piv.columns), 1.5 + 0.35 * len(piv.index)))
        sns.heatmap(piv, annot=True, fmt=".3f", cmap="RdYlGn_r", vmin=0.0, vmax=1.0, ax=ax)
        ax.set_title(f"Holm-adjusted primary p-values — {dataset_name}")
        out = output_dir / f"pvalue_heatmap_{dataset_name.replace(' ', '_')}.png"
        save_figure(fig, out)
        files.append(out)
    return files


def bland_altman(merged_by_variant: dict[str, pd.DataFrame], output_dir: Path, label_map: dict[str, str] | None = None) -> list[Path]:
    label_map = label_map or {}
    files: list[Path] = []
    for variant_id, merged in merged_by_variant.items():
        variant_label = display_label(variant_id, label_map)
        numeric = merged[merged["test_category"] == TEST_CATEGORY_NUMERIC].copy()
        for dataset_name, ds in numeric.groupby("dataset_name"):
            metrics = sorted(ds["evaluator_name"].unique())
            if not metrics:
                continue
            ncols = min(3, max(1, len(metrics)))
            nrows = int(math.ceil(len(metrics) / ncols))
            fig, axes = plt.subplots(nrows=nrows, ncols=ncols, figsize=(4 * ncols, 3 * nrows))
            axes_arr = np.array(axes).reshape(-1)
            for i, metric in enumerate(metrics):
                ax = axes_arr[i]
                mdf = ds[ds["evaluator_name"] == metric]
                x = (mdf["score_baseline"].to_numpy() + mdf["score_variant"].to_numpy()) / 2.0
                y = mdf["score_baseline"].to_numpy() - mdf["score_variant"].to_numpy()
                ax.scatter(x, y, s=18, alpha=0.6)
                mean_diff = float(np.mean(y))
                sd_diff = float(np.std(y, ddof=1)) if len(y) > 1 else 0.0
                ax.axhline(mean_diff, color="#1F77B4", linewidth=1.2)
                ax.axhline(mean_diff + 1.96 * sd_diff, color="#D62728", linestyle="--", linewidth=1)
                ax.axhline(mean_diff - 1.96 * sd_diff, color="#D62728", linestyle="--", linewidth=1)
                ax.set_title(short_label(metric, 24))
                ax.set_xlabel("Mean(score)")
                ax.set_ylabel("Baseline - Variant")
            for j in range(len(metrics), len(axes_arr)):
                axes_arr[j].set_axis_off()
            fig.suptitle(f"Bland-Altman — {dataset_name} ({short_label(variant_label, 24)})", y=1.02)
            out = output_dir / f"bland_altman_{dataset_name.replace(' ', '_')}_{short_label(variant_id,12).replace('…','')}.png"
            save_figure(fig, out)
            files.append(out)
    return files


def main() -> None:
    args = parse_args()
    setup_style()

    output_dir = Path(args.output_base_dir) / datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    output_dir.mkdir(parents=True, exist_ok=True)

    es = Elasticsearch(args.es_url, request_timeout=60)
    run_ids = [args.baseline_run_id] + args.variant_run_ids
    label_map = build_label_map(args.label, run_ids)

    all_rows: list[dict[str, Any]] = []
    retrieval_stats: list[dict[str, Any]] = []
    for run_id in run_ids:
        docs, total, pages = fetch_run_docs(es, run_id)
        all_rows.extend(source_rows(docs))
        retrieval_stats.append({"run_id": run_id, "expected_count": total, "retrieved_docs": len(docs), "pages": pages})
        print(f"[fetch] run={run_id} retrieved_docs={len(docs)} expected_count={total} pages={pages}")
    es.close()

    df = pd.DataFrame(all_rows)
    if df.empty:
        raise RuntimeError("No score documents retrieved for requested runs.")

    df["score"] = pd.to_numeric(df["score_raw"], errors="coerce")
    dropped_non_finite = int(df["score"].isna().sum())
    if dropped_non_finite > 0:
        print(f"[warn] dropped non-finite score rows: {dropped_non_finite}")

    display_override_map = parse_display_label_overrides_env()
    category_override_map = parse_test_category_overrides_env()
    exclusions = parse_exclusions_env()
    family_map, category_map = assign_families(
        df,
        display_override_map=display_override_map,
        category_override_map=category_override_map,
        exclusions=exclusions,
    )
    df["family"] = df["evaluator_name"].map(family_map).fillna("Unknown")
    df["test_category"] = df["evaluator_name"].map(category_map).fillna(TEST_CATEGORY_EXCLUDED)

    valid_df = df[df["score"].notna()].copy()
    agg_df, ambiguous_binary_ties = aggregate_repetitions(valid_df)
    if ambiguous_binary_ties > 0:
        print(f"[warn] dropped ambiguous binary ties during aggregation: {ambiguous_binary_ties}")

    results: list[MetricResult] = []
    merged_by_variant: dict[str, pd.DataFrame] = {}
    for variant_id in args.variant_run_ids:
        merged, pair_stats = pair_variant(agg_df, args.baseline_run_id, variant_id)
        merged_by_variant[variant_id] = merged
        print(
            f"[pair] variant={variant_id} valid_pairs={pair_stats['valid_pairs']} "
            f"missing_pairs={pair_stats['missing_pairs']} "
            f"missing_from_variant={pair_stats['missing_from_variant']} "
            f"missing_from_baseline={pair_stats['missing_from_baseline']}"
        )
        if merged.empty:
            continue
        grouped = merged.groupby(["dataset_id", "dataset_name", "evaluator_name", "family", "test_category"], dropna=False)
        for _, group in grouped:
            results.append(compute_result(
                group=group,
                baseline_run_id=args.baseline_run_id,
                variant_run_id=variant_id,
                n_bootstrap=args.bootstrap,
                seed=args.seed,
            ))

    if not results:
        raise RuntimeError("No comparable metric groups found after pairing.")

    results_df = pd.DataFrame([asdict(r) for r in results])
    results_df = apply_holm(results_df, alpha=args.alpha)

    summary_text = write_summary(results_df, output_dir=output_dir, label_map=label_map, alpha=args.alpha)
    print("")
    print(summary_text)

    artifacts: list[Path] = [output_dir / "summary.md"]
    artifacts.extend(effect_forest(results_df, output_dir=output_dir, label_map=label_map))
    artifacts.extend(box_plots(agg_df, output_dir=output_dir, label_map=label_map))
    artifacts.extend(pvalue_heatmap(results_df, output_dir=output_dir, label_map=label_map))
    artifacts.extend(bland_altman(merged_by_variant, output_dir=output_dir, label_map=label_map))

    payload = {
        "generated_at": datetime.now().isoformat(),
        "config": {
            "baseline_run_id": args.baseline_run_id,
            "variant_run_ids": args.variant_run_ids,
            "alpha": args.alpha,
            "bootstrap": args.bootstrap,
            "label_map": label_map,
            "display_metric_overrides": display_override_map,
            "test_category_overrides": category_override_map,
        },
        "retrieval": retrieval_stats,
        "diagnostics": {
            "dropped_non_finite_scores": dropped_non_finite,
            "dropped_ambiguous_binary_ties": ambiguous_binary_ties,
        },
        "family_map": family_map,
        "results": results_df.to_dict(orient="records"),
        "artifacts": [str(p) for p in artifacts],
    }
    (output_dir / "results.json").write_text(json.dumps(payload, indent=2))
    artifacts.append(output_dir / "results.json")

    print(f"[done] output_dir={output_dir}")
    print("[files]")
    for artifact in artifacts:
        print(f"- {artifact}")


if __name__ == "__main__":
    main()
