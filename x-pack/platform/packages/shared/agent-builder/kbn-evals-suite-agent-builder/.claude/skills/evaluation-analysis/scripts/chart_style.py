"""Shared chart styling for evaluation-analysis skill."""

from __future__ import annotations

from pathlib import Path

import matplotlib.pyplot as plt
import seaborn as sns

SIGNIFICANT_COLOR = "#2E7D32"
NOT_SIGNIFICANT_COLOR = "#9E9E9E"


def setup_style() -> None:
    sns.set_theme(style="whitegrid", context="paper")
    plt.rcParams.update(
        {
            "figure.dpi": 150,
            "savefig.dpi": 150,
            "axes.titlesize": 11,
            "axes.labelsize": 10,
            "legend.fontsize": 9,
            "xtick.labelsize": 9,
            "ytick.labelsize": 9,
        }
    )


def sig_color(is_significant: bool) -> str:
    return SIGNIFICANT_COLOR if is_significant else NOT_SIGNIFICANT_COLOR


def short_label(value: str, max_len: int = 16) -> str:
    if len(value) <= max_len:
        return value
    return f"{value[:max_len-1]}…"


def save_figure(fig: plt.Figure, output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    fig.tight_layout()
    fig.savefig(output_path, bbox_inches="tight")
    plt.close(fig)
