# Embedded Lens examples

To run this example plugin, use the command `yarn start --run-examples`.

This example shows how to embed Lens into other applications. Using the `EmbeddableComponent` of the `lens` start plugin,
you can pass in a valid Lens configuration which will get rendered the same way Lens dashboard panels work. Updating the
configuration will reload the embedded visualization.

## Link to editor

It is possible to use the same configuration and the `navigateToPrefilledEditor` method to navigate the current user to a
prefilled Lens editor so they can manipulate the configuration on their own and even save the results to a dashboard.
Make sure to always check permissions using `canUseEditor` whether the current user has permissions to access Lens.