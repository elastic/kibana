# Ui actions enhanced examples

To run this example plugin, use the command `yarn start --run-examples`.


## Drilldown examples

This plugin holds few examples on how to add drilldown types to dashboard.

To play with drilldowns, open any dashboard, click "Edit" to put it in *edit mode*.
Now when opening context menu of dashboard panels you should see "Create drilldown" option.

![image](https://user-images.githubusercontent.com/9773803/80460907-c2ef7880-8934-11ea-8400-533bb9d57e36.png)

Once you click "Create drilldown" you should be able to see drilldowns added by
this sample plugin.

![image](https://user-images.githubusercontent.com/9773803/80460408-131a0b00-8934-11ea-81e4-137e9e33f34b.png)


### `dashboard_hello_world_drilldown`

`dashboard_hello_world_drilldown` is the most basic "hello world" example showing
how a drilldown can be built, all in one file.

### `dashboard_to_url_drilldown`

`dashboard_to_url_drilldown` is a good starting point for build a drilldown
that navigates somewhere externally.

One can see how middle-click or Ctrl + click behavior could be supported using
`getHref` field.

### `dashboard_to_discover_drilldown`

`dashboard_to_discover_drilldown` shows how a real-world drilldown could look like.
