# @kbn/isomer-components

Kibana's [Isomer](https://github.com/elastic/isomer) pack of content and layout primitives, for React, HTML, Markdown, text, and Slack Block Kit.

## Component Primitives

- `markdown`: GitHub-flavored Markdown.
  - `{ type: 'markdown', text }`, the same node as Agent Builder's `MarkdownNode`.
  - React and HTML parse with the same `mdast` libraries as `md.authored` and render the tree: raw HTML is dropped, `href` and `src` are sanitized, and source past the parse budget is inert text. The parse moves to the SDK with [elastic/isomer#220](https://github.com/elastic/isomer/issues/220).
  - Markdown and Slack use `md.authored`, so GFM tables become Slack `table` blocks.

Each primitive is a folder under `src/primitives/`, registered in `src/pack.ts`. `src/pack.test.ts` checks that registration and runs conformance for every example on every surface.
