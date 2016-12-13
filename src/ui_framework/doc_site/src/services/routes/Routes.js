
import Slugify from '../string/slugify';

import LocalNavExample
  from '../../views/local_nav/local_nav_example.jsx';

// Component route names should match the component name exactly.
const components = [{
  name: 'LocalNav',
  component: LocalNavExample,
}];

export default {
  components: Slugify.each(components, 'name', 'path'),
  getAppRoutes: function getAppRoutes() {
    const list = this.components;
    return list.slice(0);
  },
};
