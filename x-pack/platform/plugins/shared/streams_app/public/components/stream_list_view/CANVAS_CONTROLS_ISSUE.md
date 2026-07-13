# Streams canvas — controls & overall feel

> **From:** Design
> **About:** How the streams canvas should behave — navigation (zoom, pan), the
> control surfaces (zoom controls, minimap, toolbar), layout, and the overall look
> and feel.
> **Reference for the interaction model:** React Flow "Feature Overview" —
> https://reactflow.dev/examples/overview

## The intent

The canvas is where people make sense of their streams — sources, pipelines,
destinations, and routing shown as connected nodes. It should feel like a modern,
calm diagramming tool: direct, forgiving, and quiet. People should be able to move
around effortlessly, focus on one part of the graph without losing the whole, and
never feel lost or "stuck in the void."

Nothing here should feel like a custom, surprising interaction. Where possible it
should match the muscle memory people already have from tools like Figma,
Miro/whiteboards, and the standard React Flow behaviors in the reference above.

## Navigating the canvas

**Panning**

- Two-finger scroll / trackpad swipe pans the canvas in any direction. This is the
  primary way people move around — it should feel like pushing the canvas, not
  scrolling a page.
- Click-dragging an empty area of the canvas also pans it.
- The cursor communicates the mode: an open hand at rest over pannable space, a
  closed/grabbing hand while actively dragging.
- Panning is bounded. People can move a comfortable margin around the graph, but they
  can't drift off into infinite empty space and lose their work. When there's
  "nowhere useful to go," the canvas gently stops.

**Zooming**

- Pinch-to-zoom on the trackpad zooms, centered on the pointer.
- Zoom has sensible limits: not so far out that nodes become unreadable dots, not so
  far in that a single card fills the screen. Roughly "see the whole flow" to "read a
  couple of nodes comfortably."
- Scrolling should pan, not zoom — zoom is deliberate (pinch or the zoom controls),
  so people don't accidentally zoom while trying to move.

## Selecting and moving nodes

The selection model should match the standard, expected behavior:

- **Click** a node to select it and open its details.
- **Drag** a node to reposition it.
- **Hold Shift and drag** an empty area to draw a selection box around several nodes.
- **Hold Shift and click** to add or remove individual nodes from the selection.
- A multi-selection can be moved together as a group.

Selection should be clearly visible — a selected node gets an unmistakable, on-brand
highlight (not a faint default outline that's easy to miss).

## Layout & alignment

- Nodes snap to an invisible grid as they're moved, so the diagram stays tidy and
  connections line up cleanly instead of looking hand-jittered.
- A **"Tidy up"** action arranges the graph into a clean, readable layout — aligning
  nodes into orderly left-to-right columns and reframing the view — helpful after
  adding several nodes or when things get messy. It lives in the **right-click menu**:
  right-clicking the empty canvas tidies the whole graph, and right-clicking a
  selection of nodes offers "Tidy up selection" to arrange just those.
- The background carries a subtle dot-grid that hints at the snapping and gives the
  canvas depth without competing with the content.

## The control surfaces

Three lightweight overlays float above the canvas. All of them are quiet, rounded,
and consistent with the rest of the product — present when needed, never shouting.

**Zoom controls** — a small stack for zoom in, zoom out, and "fit to screen."

- Zoom in / out step smoothly.
- "Fit to screen" reframes the whole graph with comfortable padding, in a short
  animated move (not an instant jump).
- The zoom-in / zoom-out affordances should feel unavailable when you've reached the
  max / min — you shouldn't be able to keep clicking with no effect.
- A current zoom level indicator (and an easy "reset to 100%") would be a welcome
  addition.

**Minimap** — a small overview of the entire graph with a movable viewport indicator.

- Node "blips" are colored by type so the shape of the graph is legible at a glance.
- Clicking or dragging on the minimap moves the main viewport there, with a smooth
  transition.
- When a flow is highlighted on the canvas, the minimap mirrors that focus — nodes
  outside the highlighted flow dim so the relevant path stands out.
- It can be **collapsed** to a single small button to reclaim space, and reopened just
  as easily. Its collapsed/expanded state should feel obvious and reversible.

**Toolbar** — the primary actions for building the graph (undo / redo, and adding new
nodes such as sources and destinations).

- Undo / redo clearly reflect whether there's anything to undo or redo.
- Adding a node supports both dragging it onto the canvas and click-to-place.

### Placement

- Zoom controls sit in the **bottom-left**, the minimap in the **bottom-right**, and
  the primary toolbar centered along the bottom.
- All three keep a consistent margin from the edges and never overlap the graph in a
  way that hides content. They should adapt gracefully to smaller viewports.

## Look and feel

- Calm, neutral, EUI-consistent chrome: soft rounded corners, restrained
  shadow/border, generous but not wasteful spacing.
- Fully correct in both **light and dark** modes — colors, contrast, the grid, and the
  minimap mask all adapt; nothing is hard-coded to one theme.
- Motion is subtle and purposeful: recentring, fit-to-screen, and focus changes ease
  in smoothly; there are no distracting or long animations.
- No third-party attribution or branding on the canvas.

## Accessibility

- Every control is keyboard reachable and operable, with clear labels and visible
  focus states that meet contrast requirements in both themes.
- All text is localizable (no baked-in English strings).

## What "done" feels like

- Moving around the canvas is effortless and predictable; people never get lost or
  stranded in empty space.
- Selecting, moving, and multi-selecting nodes matches standard expectations with no
  surprises.
- The graph stays tidy on its own, and can be cleaned up in one action.
- The zoom controls, minimap, and toolbar are quietly present, consistent, and
  reversible — and they look right in light and dark.
- The whole thing feels like a polished, first-party Elastic experience rather than a
  raw diagram library.

## Open questions for the team

1. Do we want a visible zoom-percentage indicator and a "reset to 100%" control in the
   first version?
2. Should people be able to reposition the control overlays, or do we keep the
   placement fixed by design?
3. Is the right-click menu discoverable enough for "Tidy up," or should it also be
   surfaced as a visible control?
4. How much of the highlight-a-flow ("spotlight") behavior should carry into the
   minimap?

## Reference

- React Flow — Feature Overview (the baseline interaction model we're building on):
  https://reactflow.dev/examples/overview
