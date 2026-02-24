"""
Evaluator for GEPA: calls Kibana evaluate API and scores candidate prompts
by comparing pipeline output to expected_outputs.
"""
from __future__ import annotations

import json
import os
from typing import Any

import requests

try:
    import gepa.optimize_anything as oa
except ImportError:
    oa = None

# Load .env then read config (config.py loads dotenv)
import config as _gepa_config  # noqa: E402

KIBANA_URL = _gepa_config.KIBANA_URL
CONNECTOR_ID = _gepa_config.CONNECTOR_ID


def _normalize_doc(doc: dict[str, Any]) -> dict[str, Any]:
    """Normalize a document for comparison (e.g. ignore @timestamp, sort keys)."""
    out = {}
    for k, v in sorted(doc.items()):
        if k in ("@timestamp", "error"):
            continue
        if isinstance(v, dict):
            out[k] = _normalize_doc(v)
        elif isinstance(v, list):
            out[k] = [_normalize_doc(x) if isinstance(x, dict) else x for x in v]
        else:
            out[k] = v
    return out


def _doc_match(actual: dict[str, Any], expected: dict[str, Any], relaxed: bool = True) -> bool:
    """Check if actual output matches expected (optionally relaxed: only expected keys)."""
    if relaxed:
        norm_actual = _normalize_doc(actual)
        norm_expected = _normalize_doc(expected)
        for key, exp_val in norm_expected.items():
            if key not in norm_actual:
                return False
            if isinstance(exp_val, dict) and isinstance(norm_actual.get(key), dict):
                if not _doc_match(norm_actual[key], exp_val, relaxed=True):
                    return False
            elif norm_actual[key] != exp_val:
                return False
        return True
    return _normalize_doc(actual) == _normalize_doc(expected)


def evaluate(
    candidate: str | dict[str, str],
    example: dict[str, Any],
    kibana_url: str | None = None,
    connector_id: str | None = None,
    auth_headers: dict[str, str] | None = None,
) -> tuple[float, dict[str, Any]]:
    """
    Evaluate a candidate prompt on one golden example.

    Args:
        candidate: Either a single prompt string (used as INGEST_PIPELINE_GENERATOR_PROMPT)
                   or a dict of prompt overrides, e.g. {"INGEST_PIPELINE_GENERATOR_PROMPT": "..."}.
        example: Golden example with keys input_logs (list[str]) and expected_outputs (list[dict]).
        kibana_url: Override Kibana base URL.
        connector_id: Override inference connector ID.
        auth_headers: Optional headers for the request.

    Returns:
        (score, side_info): score in [0, 1] (higher is better); side_info for ASI.
    """
    url = (kibana_url or KIBANA_URL).rstrip("/") + "/internal/automatic_import_v2/evaluate"
    conn_id = connector_id or CONNECTOR_ID
    if not conn_id:
        return 0.0, {"error": "CONNECTOR_ID (or GEPA_CONNECTOR_ID) not set"}

    input_logs = example.get("input_logs", [])
    expected = example.get("expected_outputs", [])
    if not input_logs or not expected:
        return 0.0, {"error": "example must have input_logs and expected_outputs"}

    if isinstance(candidate, str):
        prompt_overrides = {"INGEST_PIPELINE_GENERATOR_PROMPT": candidate}
    else:
        prompt_overrides = candidate

    headers = {"Content-Type": "application/json", **(auth_headers or {})}
    body = {
        "samples": input_logs,
        "connectorId": conn_id,
        "promptOverrides": prompt_overrides,
    }

    # Evaluate API is synchronous: Kibana runs the full agent (orchestrator -> pipeline gen -> validator)
    # and returns only when done. For large example sets this can take several minutes.
    timeout_sec = int(os.environ.get("GEPA_EVALUATE_TIMEOUT", "600"))
    try:
        resp = requests.post(url, json=body, headers=headers, timeout=timeout_sec)
    except Exception as e:
        if oa:
            oa.log(f"Request error: {e}")
        return 0.0, {"error": str(e), "request_url": url}

    if resp.status_code != 200:
        msg = resp.text or resp.reason
        if oa:
            oa.log(f"Kibana evaluate API error: {resp.status_code} {msg}")
        return 0.0, {"error": msg, "status_code": resp.status_code}

    data = resp.json()
    pipeline = data.get("current_pipeline")
    actual_outputs = data.get("pipeline_generation_results") or []
    validation = data.get("pipeline_validation_results") or {}

    if not pipeline:
        if oa:
            oa.log("No pipeline returned")
        return 0.0, {"error": "No pipeline returned", "validation": validation}

    # pipeline_generation_results is only populated when the validator runs and docs succeed
    if len(actual_outputs) == 0:
        if oa:
            oa.log(
                "pipeline_generation_results is empty: pipeline may have failed validation for all samples, "
                "or the agent did not run the validator. Check pipeline_validation_results."
            )

    # Score: match rate of actual vs expected (by index, up to len(expected))
    matches = 0
    failures = []
    for i, exp in enumerate(expected):
        if i >= len(actual_outputs):
            failures.append({"index": i, "reason": "missing output", "expected": exp})
            continue
        act = actual_outputs[i] if isinstance(actual_outputs[i], dict) else {}
        if _doc_match(act, exp, relaxed=True):
            matches += 1
        else:
            failures.append({"index": i, "expected": exp, "actual": act})

    score = matches / len(expected) if expected else 0.0

    side_info = {
        "score": score,
        "example_id": example.get("id", ""),
        "success_rate": validation.get("success_rate", 0),
        "failed_samples": validation.get("failed_samples", 0),
        "total_samples": validation.get("total_samples", 0),
        "failure_details": validation.get("failure_details", [])[:10],
        "match_count": matches,
        "total_expected": len(expected),
        "actual_outputs_count": len(actual_outputs),
        "failures": failures[:5],
    }
    if oa:
        oa.log(json.dumps(side_info, indent=2, default=str))

    return score, side_info
