define(function (require) {
  return function AlertsFactory(Private) {
    let d3 = require('d3');
    let $ = require('jquery');
    let _ = require('lodash');
    let Binder = require('ui/Binder');

    /**
     * Adds allerts that float in front of a visualization
     *
     * @class Alerts
     * @constructor
     * @param el {HTMLElement} Reference to DOM element
     */
    function Alerts(vis, data, alertDefs) {
      if (!(this instanceof Alerts)) {
        return new Alerts(vis, data, alertDefs);
      }

      this.vis = vis;
      this.data = data;
      this.binder = new Binder();
      this.alertDefs = alertDefs || [];

      this.binder.jqOn(vis.el, 'mouseenter', '.vis-alerts-tray', function () {
        let $tray = $(this);
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
          let pos = $tray.offset();
          if (pos.top > event.clientY || pos.left > event.clientX) return show();

          let bottom = pos.top + $tray.height();
          if (event.clientY > bottom) return show();

          let right = pos.left + $tray.width();
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
    Alerts.prototype.render = function () {
      let vis = this.vis;
      let data = this.data;

      let alerts = _(this.alertDefs)
      .map(function (alertDef) {
        if (!alertDef) return;
        if (alertDef.test && !alertDef.test(vis, data)) return;

        let type = alertDef.type || 'info';
        let icon = alertDef.icon || type;
        let msg = alertDef.msg;

        // alert container
        let $icon = $('<i>').addClass('vis-alerts-icon fa fa-' + icon);
        let $text = $('<p>').addClass('vis-alerts-text').text(msg);

        return $('<div>').addClass('vis-alert vis-alert-' + type).append([$icon, $text]);
      })
      .compact();

      if (!alerts.size()) return;

      $(vis.el).find('.vis-alerts').append(
        $('<div>').addClass('vis-alerts-tray').append(alerts.value())
      );
    };

    /**
     * Tear down the Alerts
     * @return {undefined}
     */
    Alerts.prototype.destroy = function () {
      this.binder.destroy();
    };

    return Alerts;
  };
});
