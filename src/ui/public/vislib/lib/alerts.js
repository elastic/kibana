import $ from 'jquery';
import _ from 'lodash';
import Binder from 'ui/binder';
export default function AlertsFactory(Private) {

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
      this.binder = new Binder();
      this.alertDefs = alertDefs || [];

      this.binder.jqOn(vis.el, 'mouseenter', '.vis-alerts-tray', function () {
        const $tray = $(this);
        hide();
        $(vis.el).on('mousemove', checkForExit);

        function hide() {
          $tray.css({
            'pointer-events': 'none',
            opacity: 0.3
          });
        }

        function show() {
          $(vis.el).off('mousemove', checkForExit);
          $tray.css({
            'pointer-events': 'auto',
            opacity: 1
          });
        }

        function checkForExit(event) {
          const pos = $tray.offset();
          if (pos.top > event.clientY || pos.left > event.clientX) return show();

          const bottom = pos.top + $tray.height();
          if (event.clientY > bottom) return show();

          const right = pos.left + $tray.width();
          if (event.clientX > right) return show();
        }
      });
    }

    /**
     * Renders chart titles
     *
     * @method render
     * @returns {D3.Selection|D3.Transition.Transition} DOM element with chart titles
     */
    render() {
      const vis = this.vis;
      const data = this.data;

      const alerts = _(this.alertDefs)
      .map(function (alertDef) {
        if (!alertDef) return;
        if (alertDef.test && !alertDef.test(vis, data)) return;

        const type = alertDef.type || 'info';
        const icon = alertDef.icon || type;
        const msg = alertDef.msg;

        // alert container
        const $icon = $('<i>').addClass('vis-alerts-icon fa fa-' + icon);
        const $text = $('<p>').addClass('vis-alerts-text').text(msg);

        return $('<div>').addClass('vis-alert vis-alert-' + type).append([$icon, $text]);
      })
      .compact();

      if (!alerts.size()) return;

      $(vis.el).find('.vis-alerts').append(
        $('<div>').addClass('vis-alerts-tray').append(alerts.value())
      );
    }

    /**
     * Tear down the Alerts
     * @return {undefined}
     */
    destroy() {
      this.binder.destroy();
    }
  }

  return Alerts;
}
