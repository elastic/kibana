import uiModules from 'ui/modules';
import chrome from 'ui/chrome';

uiModules
  .get('kibana/scripting')
  .service('scriptingLangService', ($http, Notifier) => {
    function ScriptingLangService() {
      let notify = new Notifier({ location: 'Scripting Lang Service' });

      this.getScriptingLangs = () => $http.get(chrome.addBasePath('/api/kibana/scripts/languages'))
        .then((res) => res.data)
        .catch(() => {
          return notify.error('Error getting available scripting languages from Elasticsearch');
        });
    }

    return new ScriptingLangService();
  });
