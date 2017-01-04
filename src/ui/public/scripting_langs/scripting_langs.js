import uiModules from 'ui/modules';
import chrome from 'ui/chrome';
import Notifier from 'ui/notify/notifier';

const notify = new Notifier({ location: 'Scripting Lang Service' });

export function GetScriptingLangsProvider($http) {
  return () => {
    return $http.get(chrome.addBasePath('/api/kibana/scripts/languages'))
    .then((res) => res.data)
    .catch(() => {
      notify.error('Error getting available scripting languages from Elasticsearch');
      return [];
    });
  };
}
