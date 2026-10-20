# @kbn/isomer-theme

The EUI Borealis theme for Kibana's Isomer primitive packs, as a [Distillate](https://github.com/elastic/distillate) instance.

- `isomerDistillery`: what packs author styles against (`createStyleModule`, `tokens`). Its values come from `src/borealis_tokens.generated.ts`, which `scripts/generate_borealis_tokens.js` computes from the installed EUI theme as `useEuiTheme()` would. A test fails when an EUI upgrade changes them; rerun the script. When `@elastic/design-tokens` ships, only `src/to_token_values.ts` and the script change.
- `isomerStyleAdapter`: the pack `styleAdapter` that collects the handles a render uses and emits their CSS.
- `classNames`: resolves handles in a primitive's `react` renderer.
- `kibanaCardFrame`: the `snapshot` frame `createKibanaIsomerRuntime` registers as `card`: 760px wide on the Borealis plain background, inside the `.isomer` root its stylesheet is scoped to. The body flows as blocks, as on the web, padded by `size.l` with its first and last nodes' outer margins dropped, and is centered vertically. Its height is the padding plus each node's `metrics.snapshotHeight`, or `CARD_FALLBACK_NODE_HEIGHT` for a node without one, so a pack sizes its own primitives; `CARD_CONTENT_WIDTH` is the width they wrap in. Centering turns an estimate that runs tall into even padding. Both are stopgaps until Isomer measures content (elastic/isomer#256).
- `borealisLight`: the light token values, for code that needs them as numbers, such as a primitive's snapshot height.
- `createIsomerStyleContext({ root })`: the React render context that writes the CSS of the handles a render resolves to one `<style>` in `root`, a document (the default) or a shadow root. `createKibanaIsomerRuntime` uses it for the document, so hosts need it only for a shadow root.

Colors resolve through `light-dark()`, which follows the wrapper's `data-theme`. Hosts must render with `theme` set from Kibana's color mode; without it, the page's `color-scheme` decides. Shadows aren't colors, so `light-dark()` can't carry them: they switch on `data-theme='dark'` alone and stay light without it.

High contrast mode is not supported yet: `light-dark()` has no contrast branch, so it needs a third token set and its own override.
