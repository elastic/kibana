import $ from 'jquery';
import _ from 'lodash';

export function VislibLibAlertsProvider() {

  /**
   * Adds allerts that float in front of a visualization
   *
   * @class Alerts
   * @constructor
   * @param el {HTMLElement} Reference to DOM element
   */
  class Alerts {
    constructor(vis, alertDefs) {
      this.vis = vis;
      this.data = vis.data;
      this.alertDefs = _.cloneDeep(alertDefs);

      this.alerts = _(alertDefs)
        .map(alertDef => {
          if (!alertDef) return;
          if (alertDef.test && !alertDef.test(vis, this.data)) return;
          return this._addAlert(alertDef);
        })
        .compact();
    }

    _addAlert(alertDef) {
      const type = alertDef.type || 'info';
      const icon = alertDef.icon || type;
      const msg = alertDef.msg;
      // alert container
      const $icon = $('<i>').addClass('vis-alerts-icon fa fa-' + icon);
      const $text = $('<p>').addClass('vis-alerts-text').text(msg);
      const $closeIcon =  $('<i>').addClass('fa fa-close');
      const $closeDiv = $('<div>').addClass('vis-alerts-close').append($closeIcon);

      const $alert = $('<div>').addClass('vis-alert vis-alert-' + type).append([$icon, $text, $closeDiv]);
      $closeDiv.on('click', () => {
        $alert.remove();
      });

      return $alert;
    }

    // renders initial alerts
    render() {
      const alerts = this.alerts;
      const vis = this.vis;

      $(vis.el).find('.vis-alerts').append($('<div>').addClass('vis-alerts-tray'));
      if (!alerts.size()) return;
      $(vis.el).find('.vis-alerts-tray').append(alerts.value());
    }

    // shows new alert
    show(msg, type) {
      const vis = this.vis;
      const alert = {
        msg: msg,
        type: type
      };
      if (this.alertDefs.find(alertDef => alertDef.msg === alert.msg)) return;
      this.alertDefs.push(alert);
      $(vis.el).find('.vis-alerts-tray').append(
        this._addAlert(alert)
      );
    }

    destroy() {
      $(this.vis.el).find('.vis-alerts').remove();
    }
  }

  return Alerts;
}
