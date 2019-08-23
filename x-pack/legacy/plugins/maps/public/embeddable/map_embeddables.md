### MapEmbeddableFactory
Use to load map saved object and create MapEmbeddable instance.

### MapEmbeddable
Renders map saved object. State comes from saved object.

#### Customizable parameters
- **hideFilterActions:** (Boolean) Set to true to hide all filtering controls.
- **isLayerTOCOpen:** (Boolean) Set to false to render map with legend in collapsed state.
- **openTOCDetails:** (Array of Strings) Array of layer ids. Add layer id to show layer details on initial render.
- **mapCenter:** ({lat, lon, zoom }) Provide mapCenter to customize initial map location.


Customize embeddable state by providing properties for `MapEmbeddableFactory.createFromSavedObject` `input` parameter.

```
  const factory = new MapEmbeddableFactory();
  const mapEmbeddable = await factory.createFromSavedObject(
    'de71f4f0-1902-11e9-919b-ffe5949a18d2',
    {
      hideFilterActions: true,
      isLayerTOCOpen: false,
      openTOCDetails: ['tfi3f', 'edh66'],
      mapCenter: { lat: 0.0, lon: 0.0, zoom: 7 }
    }
  );
```
