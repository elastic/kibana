# Inline editing of Lens embeddable

To run this example plugin, use the command `yarn start --run-examples`.

This plugin contains examples on how to integrate the inline editing capabilities to your Lens embeddable.

Steps:

- Add UIActions on your start dependencies
- On your embeddable use the onLoad callback to store in the local state the adapters and lensEmbeddableOutput$.

```tsx
// my Lens embeddable
<LensComponent {...embeddableInput} onLoad={onLoad} />
```

```tsx
const [lensLoadEvent, setLensLoadEvent] = useState<
  InlineEditLensEmbeddableContext['lensEvent'] | null
>(null);
// my onLoad callback
const onLoad = useCallback(
  (
    isLoading: boolean,
    adapters: LensChartLoadEvent['adapters'] | undefined,
    lensEmbeddableOutput$?: LensChartLoadEvent['embeddableOutput$']
  ) => {
    const adapterTables = adapters?.tables?.tables;
    if (adapterTables && !isLoading) {
      setLensLoadEvent({
        adapters,
        embeddableOutput$: lensEmbeddableOutput$,
      });
    }
  },
  []
);
```

- Create the triggerOptions. You will need:
  - The attributes of the lens embeddable input
  - The lensChartEvent that you retrieved from the onLoad callback
  - An onUpdate callback to update the embeddable input with the new attributes
  - An optional onApply callback if you want to add an action when the Apply button is clicked
  - An optional onCancel callback if you want to add an action when the Cancel button is clicked

```tsx
// my trigger options
const triggerOptions = {
  attributes: embeddableInput?.attributes,
  lensEvent: lensLoadEvent,
  onUpdate: (newAttributes: TypedLensByValueInput['attributes']) => {
    // onUpdate I need to update my embeddableInput.attributes
  },
  onApply: () => {
    // optional callback when Apply button is clicked
  },
  onCancel: () => {
    // optional callback when Cancel button is clicked
  },
};
```

- Add a button which will open the editing flyout. Execute the IN_APP_EMBEDDABLE_EDIT_TRIGGER trigger onClick

```tsx
uiActions.executeTriggerActions('IN_APP_EMBEDDABLE_EDIT_TRIGGER', triggerOptions);
```

### Important note

In case you don't want to open a push flyout you can pass an html element to the triggerOptions, the `container` property. This is going
to render the inline editing component to this container element. In that case you will need an extra handling on your side.
Check the 3rd example for implementation details.
