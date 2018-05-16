export default function (kibana) {

  return new kibana.Plugin({
    uiExports: {
      app: {
        title: 'Test Plugin App',
        description: 'This is a sample plugin for the functional tests.',
        main: 'plugins/test_plugin_apps/app',
      }
    }
  });
}
