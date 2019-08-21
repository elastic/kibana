### MapEmbeddableFactory
Use to load map saved object and create MapEmbeddable instance.

### MapEmbeddable
Renders map saved object. State comes from saved object.

#### Customizable parameters
- **hideFilterActions:** (Boolean) Set to true to hide all filter creation UIs like draw controls.
- **isLayerTOCOpen:** (Boolean) Set to false to render map with collapse legended.
- **openTOCDetails:** (Array of Strings) Array of layer ids. Add layer id to show layer details in legend on initial render
- **mapCenter:** ({lat, lon, zoom }) Provide mapCenter to customize intial map center and zoom.


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
