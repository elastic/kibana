# Third party maps source example plugin

An example plugin for a custom raster tile source in Maps. 

This example plugin uses a [time-enabled radar imagery service from the U.S. National Weather Service](https://idpgis.ncep.noaa.gov/arcgis/rest/services/radar/radar_base_reflectivity_time/ImageServer). The service URL contains a `{time}` template field that is populated as [Unix time](https://en.wikipedia.org/wiki/Unix_time) from the Kibana time picker. The time slider in Maps can also be used to animate the service. 

## Demo
1. Open a new Map and modify the time picker to the "Last 2 hours". 
2. Click "Add layer" and choose "Weather" to add the layer to the map.
3. You should see current precipitation models over the U.S. 
4. Use the timeslider to animate the radar model.

---

## Development

See the [kibana contributing guide](https://github.com/elastic/kibana/blob/main/CONTRIBUTING.md) for instructions setting up your development environment.
