# @kbn/isomer

Kibana's host for [Isomer](https://github.com/elastic/isomer): one declarative composition rendered to React, HTML, Markdown, text and Slack Block Kit.

Kibana code imports Isomer through this package rather than from `@elastic/isomer-*` directly. `createKibanaIsomerRuntime` takes the primitive packs to compose and applies Kibana defaults.

React renders are styled with no setup. `surfaces.react.render` wraps the output in the `.isomer` root and writes the CSS of the [`@kbn/isomer-theme`](../isomer-theme) styles it uses to one `<style>` in the document, light and dark. Set the color mode with `theme` on the composition or `wrapper: { theme }`; without one, the page's `color-scheme` decides. A `wrapper` or `context` passed to `render` replaces the default, so a host rendering into a shadow root passes `context: createIsomerStyleContext({ root })`. The `html` surface styles itself through each pack's `styleAdapter`.

The `snapshot` surface, which a rasterizer turns into PNG or PDF, draws in a frame. Every runtime gets one, `card`: [`@kbn/isomer-theme`](../isomer-theme)'s `kibanaCardFrame`, 760px wide on the Borealis plain background. Pass `frames` to replace it, and `defaultFrame` to name one of yours. `createKibanaCardFrame({ width })` makes a card of another width whose primitives estimate their height at that width; a frame spread from the card with a new `defaultWidth` would still estimate at 760px:

```ts
createKibanaIsomerRuntime({
  packs: [componentsPack],
  frames: { card: kibanaCardFrame, wide: createKibanaCardFrame({ width: 1200 }) },
  defaultFrame: 'wide',
});
```

The runtime imports `react-dom/server`, so browser code must load it lazily.
