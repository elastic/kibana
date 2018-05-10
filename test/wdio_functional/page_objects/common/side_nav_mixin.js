import { PageRegion } from './base_page';
import { testSubjectifySelector } from '../../helpers/helpers';
import ConsolePage from '../console/console_page';

export default class SideNav extends PageRegion {

  constructor(driver) {
    super(driver, testSubjectifySelector('globalNav', 'css'));

    this.baseLinkSelector = testSubjectifySelector('appLink', 'xpath');
    this.consoleLinkSelector = this.baseLinkSelector + '[@aria-label="Dev Tools"' ;
  }

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
        this.driver.click(this.consoleLinkSelector);
        return new ConsolePage(this.driver);
      case 'Management':
        break;
      default:
        throw new Error();

    }
  }
}
