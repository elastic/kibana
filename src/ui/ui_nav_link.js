export default class UiNavLink {
  constructor(uiExports, spec) {
    this.id = spec.id;
    this.title = spec.title;
    this.order = spec.order || 0;
    this.url = `${uiExports.urlBasePath || ''}${spec.url}`;
    this.subUrlBase = `${uiExports.urlBasePath || ''}${spec.subUrlBase || spec.url}`;
    this.description = spec.description;
    this.icon = spec.icon;
    this.linkToLastSubUrl = spec.linkToLastSubUrl === false ? false : true;
    this.hidden = spec.hidden || false;
    this.disabled = spec.disabled || false;
    this.tooltip = spec.tooltip || '';
  }
}
