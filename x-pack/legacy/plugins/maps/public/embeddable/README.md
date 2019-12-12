
### Map specific `input` parameters
- **hideFilterActions:** (Boolean) Set to true to hide all filtering controls.
- **isLayerTOCOpen:** (Boolean) Set to false to render map with legend in collapsed state.
- **openTOCDetails:** (Array of Strings) Array of layer ids. Add layer id to show layer details on initial render.
- **mapCenter:** ({lat, lon, zoom }) Provide mapCenter to customize initial map location.
- **disableInteractive:** (Boolean) Will disable map interactions, panning, zooming in the map.
- **disableTooltipControl:** (Boolean) Will disable tooltip which shows relevant information on hover, like Continent name etc
- **hideToolbarOverlay:** (Boolean) Will disable toolbar, which can be used to navigate to coordinate by entering lat/long and zoom values.

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

#### Customize tooltip
```
/**
 * Render custom tooltip content
 *
 * @param {function} addFilters
 * @param {function} closeTooltip
 * @param {Array} features - Vector features at tooltip location.
 * @param {boolean} isLocked
 * @param {function} getLayerName - Get layer name. Call with (layerId). Returns Promise.
 * @param {function} loadFeatureProperties - Loads feature properties. Call with ({ layerId, featureId }). Returns Promise.
 * @param {function} loadFeatureGeometry - Loads feature geometry. Call with ({ layerId, featureId }). Returns geojson geometry object { type, coordinates }.
 *
 * @return {Component} A React Component.
 */
const renderTooltipContent = ({ addFilters, closeTooltip, features, isLocked, loadFeatureProperties}) => {
  return <div>Custom tooltip content</div>;
}

const mapEmbeddable = await factory.createFromState(state, input, parent, renderTooltipContent);
```


#### Event handlers
```
const eventHandlers = {
  onDataLoad: (layerId: string, dataId: string) => {
    // take action on data load
  },
  onDataLoadEnd: (layerId: string, dataId: string, resultMeta: object) => {
    // take action on data load end
  },
  onDataLoadError: (layerId: string, dataId: string, errorMessage: string) => {
    // take action on data load error
  },
}

const mapEmbeddable = await factory.createFromState(state, input, parent, renderTooltipContent, eventHandlers);
```


#### Passing in geospatial data
You can pass geospatial data into the Map embeddable by configuring the layerList parameter with a layer with `GEOJSON_FILE` source.
Geojson sources will not update unless you modify `__featureCollection` property by calling the `setLayerList` method.

```
const factory = new MapEmbeddableFactory();
const state = {
  layerList: [
    {
      'id': 'gaxya',
      'label': 'My geospatial data',
      'minZoom': 0,
      'maxZoom': 24,
      'alpha': 1,
      'sourceDescriptor': {
        'id': 'b7486',
        'type': 'GEOJSON_FILE',
        '__featureCollection': {
          "type": "FeatureCollection",
          "features": [
            {
              "type": "Feature",
              "geometry": {
                "type": "Polygon",
                "coordinates": [
                  [
                    [0, 0], [10, 10], [10, 0], [0, 0]
                  ]
                ]
              },
              "properties": {
                "name": "null island",
                "another_prop": "something else interesting"
              }
            }
          ]
        }
      },
      'visible': true,
      'style': {
        'type': 'VECTOR',
        'properties': {}
      },
      'type': 'VECTOR'
    }
  ],
  title: 'my map',
}
const input = {
  hideFilterActions: true,
  isLayerTOCOpen: false,
  openTOCDetails: ['tfi3f', 'edh66'],
  mapCenter: { lat: 0.0, lon: 0.0, zoom: 7 }
}
const mapEmbeddable = await factory.createFromState(state, input, parent);

mapEmbeddable.setLayerList([
  {
    'id': 'gaxya',
    'label': 'My geospatial data',
    'minZoom': 0,
    'maxZoom': 24,
    'alpha': 1,
    'sourceDescriptor': {
      'id': 'b7486',
      'type': 'GEOJSON_FILE',
      '__featureCollection': {
        "type": "FeatureCollection",
        "features": [
          {
            "type": "Feature",
            "geometry": {
              "type": "Polygon",
              "coordinates": [
                [
                  [35, 35], [45, 45], [45, 35], [35, 35]
                ]
              ]
            },
            "properties": {
              "name": "null island",
              "another_prop": "something else interesting"
            }
          }
        ]
      }
    },
    'visible': true,
    'style': {
      'type': 'VECTOR',
      'properties': {}
    },
    'type': 'VECTOR'
  }
]);
```
