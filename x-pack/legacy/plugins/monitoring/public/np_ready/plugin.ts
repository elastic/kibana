import {
  CoreSetup,
  CoreStart,
  LegacyCoreStart,
  Plugin,
  PluginInitializerContext
} from 'kibana/public';

/**
 * TODO: pass: uiRoutes, uiModules, and configureAppAngularModule (or their alternatives) outside np_ready
 */
import uiRoutes from 'ui/routes';
//@ts-ignore
import { uiModules } from 'ui/modules';
import { configureAppAngularModule } from 'ui/legacy_compat';


//@ts-ignore
import { localApplicationService } from 'plugins/kibana/local_application_service';

export class MonitoringPlugin implements Plugin {
  constructor(ctx: PluginInitializerContext) { }

  public setup(core: CoreSetup, dep: any) {
    //TODO
  }

  public start(core: CoreStart) {
    const kibanaModule = uiModules.get('kibana');
    configureAppAngularModule(kibanaModule, core as LegacyCoreStart, true);

    core.uiSettings.set('timepicker:timeDefaults', JSON.stringify({
      from: 'now-1h',
      to: 'now',
      mode: 'quick'
    }));

    core.uiSettings.set('timepicker:refreshIntervalDefaults', JSON.stringify({
      pause: false,
      value: 10000
    }));

    localApplicationService.attachToAngular(uiRoutes);
    uiRoutes.enable();

  }

  public stop() { }
}