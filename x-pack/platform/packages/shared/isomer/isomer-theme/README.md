# @kbn/isomer-theme

The EUI Borealis theme for Kibana's Isomer primitive packs, as a [Distillate](https://github.com/elastic/distillate) instance.

- `isomerDistillery`: what packs author styles against (`createStyleModule`, `tokens`). Its values come from `src/borealis_tokens.generated.ts`, which `scripts/generate_borealis_tokens.js` computes from the installed EUI theme as `useEuiTheme()` would. A test fails when an EUI upgrade changes them; rerun the script. When `@elastic/design-tokens` ships, only `src/to_token_values.ts` and the script change.
- `isomerStyleAdapter`: the pack `styleAdapter` that collects the handles a render uses and emits their CSS.
- `classNames`: resolves handles in a primitive's `react` renderer.

Colors resolve through `light-dark()`, which follows the wrapper's `data-theme`. Hosts must render with `theme` set from Kibana's color mode; without it, the page's `color-scheme` decides.
