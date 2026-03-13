# Chart Spec

Charts are generated when applicable (for example, p-value heatmaps require multiple variants).

## Charts

1. **Effect forest** (`effect_forest_*.png`)
   - Purpose: compare direction/magnitude/significance across metrics quickly
   - Encoding:
     - Numeric metrics: `r_rb` on linear axis
     - Binary metrics: OR on log axis
     - Marker color indicates Holm-corrected significance

2. **Distribution box plots** (`box_plots_*.png`)
   - Purpose: quick distribution sanity check for outliers/skew

3. **Holm p-value heatmap** (`pvalue_heatmap*.png`)
   - Generated only when there are multiple variants
   - Purpose: see which metric/variant cells are significant at a glance

4. **Bland-Altman** (`bland_altman_*.png`)
   - Numeric metrics only
   - Purpose: detect proportional bias and disagreement structure in paired data

## Styling contract

All charts must use `scripts/chart_style.py`:

- `setup_style()` for theme and rcParams
- semantic significance colors via `sig_color()`

Do not hardcode ad-hoc palettes in chart code.
