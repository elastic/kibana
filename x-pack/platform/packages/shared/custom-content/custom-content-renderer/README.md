# @kbn/custom-content-renderer

The browser render path for custom content panels: fetch the ES|QL rows, fill the Liquid template,
sanitize the result, inject the theme tokens, and show it in a sandboxed iframe.

It lives in its own package because it is consumed by more than one host — the dashboard embeddable
in the `customContent` plugin, and (soon) the Agent Builder visualization attachment, which renders
the same content inline in chat. Services arrive as an explicit `CustomContentRendererServices` prop
rather than through a plugin-scoped singleton, so neither host has to be the owner of the other.

It is deliberately separate from `@kbn/custom-content-common`: that package is `shared-common` and is
imported by server code, while everything here is browser-only React (EUI, Emotion, DOMPurify,
liquidjs).

## Interactions

A host can pass `onInteraction` to let a click on the content ask for an action (today, adding a
filter). `interactions.ts` is the reading half: it validates the `data-cc-*` attributes of the clicked
element against the columns the queries returned, and nothing else reaches the host. `interactionActions`
lists the actions the host runs, so a host can accept fewer than exist. The frame is same-origin so the
component can listen to it, and has no scripts (see `CUSTOM_CONTENT_IFRAME_SANDBOX`). The plugin's README
describes the contract and how to add an action.

