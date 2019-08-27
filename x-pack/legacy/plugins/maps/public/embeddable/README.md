
### Map specific `input` parameters
- **hideFilterActions:** (Boolean) Set to true to hide all filtering controls.
- **isLayerTOCOpen:** (Boolean) Set to false to render map with legend in collapsed state.
- **openTOCDetails:** (Array of Strings) Array of layer ids. Add layer id to show layer details on initial render.
- **mapCenter:** ({lat, lon, zoom }) Provide mapCenter to customize initial map location.

### Creating a Map embeddable from saved object
```
  const factory = new MapEmbeddableFactory();
  const input = {
    hideFilterActions: true,
    isLayerTOCOpen: false,
    openTOCDetails: ['tfi3f', 'edh66'],
    mapCenter: { lat: 0.0, lon: 0.0, zoom: 7 }
  }
  const mapEmbeddable = await factory.createFromSavedObject(
    'de71f4f0-1902-11e9-919b-ffe5949a18d2',
    input,
    parent
  );
```

### Creating a Map embeddable from state
```
const factory = new MapEmbeddableFactory();
const state = {
  layerList: [],  // where layerList is same as saved object layerListJSON property (unstringified)
  title: 'my map',
}
const input = {
  hideFilterActions: true,
  isLayerTOCOpen: false,
  openTOCDetails: ['tfi3f', 'edh66'],
  mapCenter: { lat: 0.0, lon: 0.0, zoom: 7 }
}
const mapEmbeddable = await factory.createFromState(state, input, parent);
```
