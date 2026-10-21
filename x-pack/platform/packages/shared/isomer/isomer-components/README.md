# @kbn/isomer-components

Kibana's [Isomer](https://github.com/elastic/isomer) pack of content and layout primitives, for React, HTML, Markdown, text, and Slack Block Kit.

## Component Primitives

- `markdown`: GitHub-flavored Markdown.
  - `{ type: 'markdown', text }`, the same node as Agent Builder's `MarkdownNode`.
  - React and HTML render with the SDK's `renderMarkdownContent`, from the same parse as `md.authored`: raw HTML is text, `href` and `src` are sanitized, and source past the parse budget is inert text.
  - Markdown and Slack use `md.authored`, so GFM tables become Slack `table` blocks.

React and HTML are styled with [`@kbn/isomer-theme`](../isomer-theme): each primitive has a style module on Borealis tokens, and the pack's `styleAdapter` emits the CSS a render uses under the `.isomer` root, in light and dark. Rendered through `createKibanaIsomerRuntime`, React output is styled with no further setup.

Each primitive is a folder under `src/primitives/`, registered in `src/pack.ts`. `src/pack.test.ts` checks that registration and runs conformance for every example on every surface.

## Isomer Studio

`isomer_studio.config.ts` loads the pack, through `createKibanaIsomerRuntime`, into [Isomer Studio](https://github.com/elastic/isomer/tree/main/packages/isomer-studio), which isn't a Kibana dependency. From this directory, `npx @elastic/isomer-studio --config isomer_studio.config.ts` opens it, and `npx @elastic/isomer-studio check --config isomer_studio.config.ts` renders every example on every surface without a browser.

Studio image previews use Kibana's Inter and Roboto Mono fonts through `isomer_studio_fonts.ts`.
