# @kbn/isomer

Kibana's host for [Isomer](https://github.com/elastic/isomer): one declarative composition rendered to React, HTML, Markdown, text and Slack Block Kit.

Kibana code imports Isomer through this package rather than from `@elastic/isomer-*` directly. `createKibanaIsomerRuntime` takes the primitive packs to compose and applies Kibana defaults.

React renders are styled with no setup. `surfaces.react.render` wraps the output in the `.isomer` root and writes the CSS of the [`@kbn/isomer-theme`](../isomer-theme) styles it uses to one `<style>` in the document, light and dark. Set the color mode with `theme` on the composition or `wrapper: { theme }`; without one, the page's `color-scheme` decides. A `wrapper` or `context` passed to `render` replaces the default, so a host rendering into a shadow root passes `context: createIsomerStyleContext({ root })`. The `html` surface styles itself through each pack's `styleAdapter`.

The runtime imports `react-dom/server`, so browser code must load it lazily.
