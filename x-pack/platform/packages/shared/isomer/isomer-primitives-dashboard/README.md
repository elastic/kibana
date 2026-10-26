# @kbn/isomer-primitives-dashboard

A Kibana dashboard as one Isomer node, `dashboard`: its title, description and period over its panels. Each panel has a `title`, a `grid` box (48 columns, 20-pixel rows), and either a `body` node or a `placeholder` that says why it has none and links to the panel in Kibana.

- `layout: 'grid'`, the default, places panels as Kibana does: by percent across the page and in 28-pixel rows. `snapshot` and `html` draw the same grid at any page width.
- `layout: 'stack'` is the mobile view: one column, in reading order (top to bottom, then left to right).
- `text`, `markdown` and `slack` always read in reading order. Slack gives each titled panel a container.
- `dashboardChartSize(width)` is a `sizeFor` for `prepareCharts`: it draws each chart at its panel body's size.

Demo lane only (`isomer/demo/dashboard-pack`). D1 re-cuts this package as a PR.
