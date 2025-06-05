# Third party Lens visualization layer

To run this example plugin, use the command `yarn start --run-examples`.

This example shows how to register a visualization layer to Lens which lives along the regular visualizations layers.
As for now only XY visualizations accept new layer types.

The following parts can be seen in this example:
* Registering the visualization layer type so it shows up in the Lens editor along with custom edit UI and hooks to update state on user interactions (add dimension, delete dimension).
* Registering the used expression functions and expression renderers to actually render the expression into a DOM element.