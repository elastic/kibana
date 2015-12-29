import modules from 'ui/modules';
const module = modules.get('kibana', [require('js-data-angular')]);

export default function storeProvider(DS) {
  return DS;
}
