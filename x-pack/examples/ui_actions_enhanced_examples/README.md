# Ui actions enhanced examples

To run this example plugin, use the command `yarn start --run-examples`.


## Drilldown examples

This plugin holds few examples on how to add drilldown types to dashboard. See
`./public/drilldowns/` folder.

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


## Drilldown Manager examples

*Drilldown Manager* is a collectio of code and React components that allows you
to add drilldowns to any app. To see examples of how drilldows can be added to
your app, run Kibana with `--run-examples` flag:

```
yarn start --run-examples
```

Then go to "Developer examples" and "UI Actions Enhanced", where you can see examples
where *Drilldown Manager* is used outside of the Dashboard app:

![image](https://user-images.githubusercontent.com/9773803/94044547-969a3400-fdce-11ea-826a-cbd0773a4000.png)

These examples show how you can create your custom UI Actions triggers and add
drilldowns to them, or use an embeddable in your app and add drilldows to it.


### Trigger examples

The `/public/triggers` folder shows how you can create custom triggers for your app.
Triggers are things that trigger some action in UI, like "user click".

Once you have defined your triggers, you need to register them in your plugin:

```ts
export class MyPlugin implements Plugin {
  public setup(core, { uiActionsEnhanced: uiActions }: SetupDependencies) {
    uiActions.registerTrigger(myTrigger);
  }
}
```

### `app1_hello_world_drilldown`

`app1_hello_world_drilldown` is a basic example that shows how you can add the most
basic drilldown to your custom trigger.

### `appx_to_dashboard_drilldown`

`app1_to_dashboard_drilldown` and `app2_to_dashboard_drilldown` show how the Dashboard
drilldown can be used in other apps, outside of Dashboard.

Basically you define it:

```ts
type Trigger = typeof MY_TRIGGER_TRIGGER;
type Context = MyAppClickContext;

export class App1ToDashboardDrilldown extends AbstractDashboardDrilldown<Trigger> {
  public readonly supportedTriggers = () => [MY_TRIGGER] as Trigger[];

  protected async getURL(config: Config, context: Context): Promise<KibanaURL> {
    return 'https://...';
  }
}
```

and then you register it in your plugin:

```ts
export class MyPlugin implements Plugin {
  public setup(core, { uiActionsEnhanced: uiActions }: SetupDependencies) {
    const drilldown = new App2ToDashboardDrilldown(/* You can pass in dependencies here. */);
    uiActions.registerDrilldown(drilldown);
  }
}
```
