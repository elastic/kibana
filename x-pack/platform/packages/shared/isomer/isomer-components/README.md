# @kbn/isomer-components

Kibana's [Isomer](https://github.com/elastic/isomer) pack of content and layout primitives, for React, HTML, Markdown, text, and Slack Block Kit.

## Component Primitives

- `markdown`: GitHub-flavored Markdown.
  - `{ type: 'markdown', text }`, the same node as Agent Builder's `MarkdownNode`.
  - React and HTML render with the SDK's `renderMarkdownContent`, from the same parse as `md.authored`: raw HTML is text, `href` and `src` are sanitized, and source past the parse budget is inert text.
  - Markdown and Slack use `md.authored`, so GFM tables become Slack `table` blocks.
- `header`: a message title, or a section label with `level` 1 to 4.
  - `{ type: 'header', text, level? }`. Slack gets a `header` block, clamped to 150 characters; React and Markdown nest it below the composition title.
  - A labeled section is a level 3 `header` followed by its content.
- `context`: a line of small, secondary facts.
  - `{ type: 'context', items: [{ text }] }`, 1 to 10 plain-text items. Slack gets one escaped `mrkdwn` element, clamped to 2,000 characters; other surfaces join the items with ` · `.
  - Plain text reaches every surface as written, so use Unicode emoji (⚠️), not Slack shortcodes (`:warning:`).
- `divider`: a rule between sections, `{ type: 'divider' }`. Slack gets a `divider` block, React an `<hr>`, Markdown and text `---`.
- `quote`: a quoted passage, such as a conclusion.
  - `{ type: 'quote', text }`, plain text up to 3,000 characters, with line breaks kept. Slack gets one `rich_text` block with a `rich_text_quote`, so the text needs no `mrkdwn` escaping.
  - To title it, put a level 3 `header` before it.
- `actions`: up to 5 link buttons, such as "View Full Investigation".
  - `{ type: 'actions', buttons: [{ label, url, primary? }] }`. Slack gets an `actions` block of URL buttons, with labels clamped to 75 characters; other surfaces render links.
  - `url` follows the navigation policy, so a relative path works in React and HTML. Slack can't open one, so it drops that button, and the block when no button is left. Hosts resolve Kibana paths to absolute URLs before building the node.

React and HTML are styled with [`@kbn/isomer-theme`](../isomer-theme): each primitive has a style module on Borealis tokens, and the pack's `styleAdapter` emits the CSS a render uses under the `.isomer` root, in light and dark. Rendered through `createKibanaIsomerRuntime`, React output is styled with no further setup.

Each primitive is a folder under `src/primitives/`, registered in `src/pack.ts`. `src/pack.test.ts` checks that registration and runs conformance for every example on every surface.

## Isomer Studio

`isomer_studio.config.ts` loads the pack, through `createKibanaIsomerRuntime`, into [Isomer Studio](https://github.com/elastic/isomer/tree/main/packages/isomer-studio), which isn't a Kibana dependency. From this directory, `npx @elastic/isomer-studio --config isomer_studio.config.ts` opens it, and `npx @elastic/isomer-studio check --config isomer_studio.config.ts` renders every example on every surface without a browser.

Studio image previews use Kibana's Inter and Roboto Mono fonts through `isomer_studio_fonts.ts`.
