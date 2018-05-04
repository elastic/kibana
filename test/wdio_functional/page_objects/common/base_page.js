import SideNav from '../common/side_nav_mixin';

export default class BasePage {

  constructor(driver) {
    this.driver = driver;
  }

  get title() {

    return this.driver.getSomething();
  }


  sideNav = new SideNav();

  nagivateHome = function () {

  }
}

export class PageRegion extends BasePage {
  constructor() {
    super();
  }
}
