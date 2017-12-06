export class UiNavLink {
  constructor(urlBasePath, spec) {
    const {
      id,
      title,
      order = 0,
      url,
      subUrlBase,
      description,
      icon,
      linkToLastSubUrl = true,
      hidden = false,
      disabled = false,
      tooltip = '',
    } = spec;

    this._id = id;
    this._title = title;
    this._order = order;
    this._url = `${urlBasePath || ''}${url}`;
    this._subUrlBase = `${urlBasePath || ''}${subUrlBase || url}`;
    this._description = description;
    this._icon = icon;
    this._linkToLastSubUrl = linkToLastSubUrl;
    this._hidden = hidden;
    this._disabled = disabled;
    this._tooltip = tooltip;
  }

  getOrder() {
    return this._order;
  }

  toJSON() {
    return {
      id: this._id,
      title: this._title,
      order: this._order,
      url: this._url,
      subUrlBase: this._subUrlBase,
      description: this._description,
      icon: this._icon,
      linkToLastSubUrl: this._linkToLastSubUrl,
      hidden: this._hidden,
      disabled: this._disabled,
      tooltip: this._tooltip,
    };
  }
}
