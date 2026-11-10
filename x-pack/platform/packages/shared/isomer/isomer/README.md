# @kbn/isomer

Kibana's host for [Isomer](https://github.com/elastic/isomer): one declarative composition rendered to React, HTML, Markdown, text and Slack Block Kit.

Kibana code imports Isomer through this package rather than from `@elastic/isomer-*` directly. It also re-exports the chart types, schemas and examples of `@elastic/isomer-primitives-charts`, which Kibana installs from the packed tarball in `../vendor` until the package publishes. `createKibanaIsomerRuntime` takes the primitive packs to compose and applies Kibana defaults.

`loadKibanaChartsPack({ environment, sceneRenderers?, getRenderContext? })` loads the charts pack on first use: with Elastic Charts' browser engine (`@elastic/isomer-charts-elastic`) when `environment` is `browser`, and with the renderers a server passes, such as the isomer plugin's lazily loaded headless engine. Charts resolve in the render context `getRenderContext` returns, which `toKibanaChartsRenderContext` builds from Kibana's settings: `theme:darkMode`, `format:number:defaultLocale` (as an `Intl` locale, `intlLocaleFor`) and `dateFormat:tz`.

React renders are styled with no setup. `surfaces.react.render` wraps the output in the `.isomer` root and writes the CSS of the [`@kbn/isomer-theme`](../isomer-theme) styles it uses to one `<style>` in the document, light and dark. Set the color mode with `theme` on the composition or `wrapper: { theme }`; without one, the page's `color-scheme` decides. A `wrapper` or `context` passed to `render` replaces the default, so a host rendering into a shadow root passes `context: createIsomerStyleContext({ root })`. The `html` surface styles itself through each pack's `styleAdapter`.

The runtime imports `react-dom/server`, so browser code must load it lazily.
