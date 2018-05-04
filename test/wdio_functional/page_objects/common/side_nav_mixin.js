import { PageRegion } from './base_page';

export default class SideNav extends PageRegion {

  _discover_link_selector = '[data-test-subj="appLink"] ';
  navigateToApp(app) {
    switch (app) {
      case 'Discover':
        break;
      case 'Visualize':
        break;
      case 'Dashboard':
        break;
      case 'Timelion':
        break;
      case 'Dev Tools':
        break;
      case 'Management':
        break;
      default:
        throw new Error();

    }
  }
}
