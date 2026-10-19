# @kbn/isomer-components

Kibana's [Isomer](https://github.com/elastic/isomer) pack of content and layout primitives, for React, HTML, Markdown, text, and Slack Block Kit.

## Component Primitives

- `markdown`: GitHub-flavored Markdown.
  - `{ type: 'markdown', text }`, the same node as Agent Builder's `MarkdownNode`.
  - React and HTML render with the SDK's `renderMarkdownContent`, from the same parse as `md.authored`: raw HTML is text, `href` and `src` are sanitized, and source past the parse budget is inert text.
  - Markdown and Slack use `md.authored`, so GFM tables become Slack `table` blocks.

React and HTML are styled with [`@kbn/isomer-theme`](../isomer-theme): each primitive has a style module on Borealis tokens, and the pack's `styleAdapter` emits the CSS a render uses under the `.isomer` root, in light and dark. Rendered through `createKibanaIsomerRuntime`, React output is styled with no further setup.

Each primitive is a folder under `src/primitives/`, registered in `src/pack.ts`. `src/pack.test.ts` checks that registration and runs conformance for every example on every surface.
