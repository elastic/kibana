import { uiModules } from 'ui/modules';
import chrome from 'ui/chrome';
import { SavedObjectsClient } from 'ui/saved_objects';

uiModules.get('kibana').service('savedObjectsClient', function ($http, $q) {
  return new SavedObjectsClient($http, chrome.getBasePath(), $q);
});
