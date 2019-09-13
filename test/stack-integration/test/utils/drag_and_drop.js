/* jshint node:true, browser:true */

var Command = require('intern/dojo/node!leadfoot/Command');
///// put this in dashboard_page.js
///////  var DragAndDrop = require('../../utils/drag_and_drop');

/**
 * A {@link module:leadfoot/Command} wrapper that adds `dragFrom` and `dragTo` methods to generate drag-and-drop events.
 * https://github.com/theintern/leadfoot/blob/dnd/helpers/DragAndDrop.js
 *
 * also see https://github.com/seleniumhq/selenium-google-code-issue-archive/issues/3604
 * and http://elementalselenium.com/tips/39-drag-and-drop
 * @example
 * var Command = require('leadfoot/Command');
 * var DragAndDrop = require('leadfoot/helpers/DragAndDrop');
 * new DragAndDrop(new Command(session))
 *     .get('http://example.com')
 *     .findById('source')
 *     .dragFrom()
 *     .end()
 *     .findById('target')
 *     .dragTo();
 */
function DragAndDrop() {
  Command.apply(this, arguments);
}

DragAndDrop.prototype = Object.create(Command.prototype);

DragAndDrop.prototype.constructor = DragAndDrop;

/**
 * Set the drag source to the specified element or to the current context element.
 *
 * @param {Element=} element
 * Element to drag (source). If not specified, defaults to the current context element.
 *
 * @param {number=} x
 * X offset in the element. If not specified, defaults to the horizontal middle of the element.
 *
 * @param {number=} y
 * Y offset in the element. If not specified, defaults to the vertical middle of the element.
 */
DragAndDrop.prototype.dragFrom = function (element, x, y) {
  if (typeof element === 'number') {
    y = x;
    x = element;
    element = null;
  }

  return new this.constructor(this, function () {
    this._session._dragSource = {
      element: element || this.parent._context[0],
      x: x,
      y: y
    };
  });
};

/**
 * Perform the drag operation by dragging from the currently set source to the specified element or to the current
 * context element.
 *
 * @param {Element=} element
 * Element to drop into (target). If not specified, defaults to the current context element.
 *
 * @param {number=} x
 * X offset in the element. If not specified, defaults to the horizontal middle of the element.
 *
 * @param {number=} y
 * Y offset in the element. If not specified, defaults to the vertical middle of the element.
 */
DragAndDrop.prototype.dragTo = function (element, x, y) {
  if (typeof element === 'number') {
    y = x;
    x = element;
    element = null;
  }

  return new this.constructor(this, function () {
    var dragTarget = {
      element: element || this.parent._context[0],
      x: x,
      y: y
    };
    var dragSource = this._session._dragSource;
    this._session._dragSource = null;

    return this.parent.executeAsync(function (dragFrom, dragTo, done) {
      var dragAndDrop = (function () {
        var dispatchEvent;
        var createEvent;

        // Setup methods to call the proper event creation and dispatch functions for the current platform.
        if (document.createEvent) {
          dispatchEvent = function (element, eventName, event) {
            element.dispatchEvent(event);
            return event;
          };

          createEvent = function (eventName) {
            return document.createEvent(eventName);
          };
        }
        else if (document.createEventObject) {
          dispatchEvent = function (element, eventName, event) {
            element.fireEvent('on' + eventName, event);
            return event;
          };

          createEvent = function (eventType) {
            return document.createEventObject(eventType);
          };
        }

        function createCustomEvent(eventName, screenX, screenY, clientX, clientY) {
          var event = createEvent('CustomEvent');
          if (event.initCustomEvent) {
            event.initCustomEvent(eventName, true, true, null);
          }

          event.view = window;
          event.detail = 0;
          event.screenX = screenX;
          event.screenY = screenY;
          event.clientX = clientX;
          event.clientY = clientY;
          event.ctrlKey = false;
          event.altKey = false;
          event.shiftKey = false;
          event.metaKey = false;
          event.button = 0;
          event.relatedTarget = null;

          return event;
        }

        function createDragEvent(eventName, options, dataTransfer) {
          var screenX = window.screenX + options.clientX;
          var screenY = window.screenY + options.clientY;
          var clientX = options.clientX;
          var clientY = options.clientY;
          var event;

          if (!dataTransfer) {
            dataTransfer = {
              data: options.dragData || {},
              setData: function (eventName, val) {
                if (typeof val === 'string') {
                  this.data[eventName] = val;
                }
              },
              getData: function (eventName) {
                return this.data[eventName];
              },
              clearData: function () {
                this.data = {};
                return true;
              },
              setDragImage: function () {}
            };
          }

          try {
            event = createEvent('DragEvent');
            event.initDragEvent(eventName, true, true, window, 0, screenX, screenY, clientX,
              clientY, false, false, false, false, 0, null, dataTransfer);
          }
          catch (error) {
            event = createCustomEvent(eventName, screenX, screenY, clientX, clientY);
            event.dataTransfer = dataTransfer;
          }

          return event;
        }

        function createMouseEvent(eventName, options, dataTransfer) {
          var screenX = window.screenX + options.clientX;
          var screenY = window.screenY + options.clientY;
          var clientX = options.clientX;
          var clientY = options.clientY;
          var event;

          try {
            event = createEvent('MouseEvent');
            event.initMouseEvent(eventName, true, true, window, 0, screenX, screenY, clientX, clientY,
              false, false, false, false, 0, null);
          }
          catch (error) {
            event = createCustomEvent(eventName, screenX, screenY, clientX, clientY);
          }

          if (dataTransfer) {
            event.dataTransfer = dataTransfer;
          }

          return event;
        }

        function simulateEvent(element, eventName, dragStartEvent, options) {
          var dataTransfer = dragStartEvent ? dragStartEvent.dataTransfer : null;
          var createEvent = eventName.indexOf('mouse') !== -1 ? createMouseEvent : createDragEvent;
          var event = createEvent(eventName, options, dataTransfer);
          return dispatchEvent(element, eventName, event);
        }

        function getClientOffset(elementInfo) {
          var bounds = elementInfo.element.getBoundingClientRect();
          var xOffset = bounds.left + (elementInfo.x || ((bounds.right - bounds.left) / 2));
          var yOffset = bounds.top + (elementInfo.y || ((bounds.bottom - bounds.top) / 2));
          return { clientX: xOffset, clientY: yOffset };
        }

        function doDragAndDrop(source, target, sourceOffset, targetOffset) {
          simulateEvent(source, 'mousedown', null, sourceOffset);
          var start = simulateEvent(source, 'dragstart', null, sourceOffset);
          simulateEvent(target, 'dragenter', start, targetOffset);
          simulateEvent(target, 'dragover', start, targetOffset);
          simulateEvent(target, 'drop', start, targetOffset);
          simulateEvent(source, 'dragend', start, targetOffset);
        }

        return function (dragFrom, dragTo) {
          var fromOffset = getClientOffset(dragFrom);
          var toOffset = getClientOffset(dragTo);
          doDragAndDrop(dragFrom.element, dragTo.element, fromOffset, toOffset);
        };
      })();

      try {
        dragAndDrop(dragFrom, dragTo);
        done(null);
      }
      catch (error) {
        done(error.message);
      }
    }, [ dragSource, dragTarget ]).finally(function (result) {
      if (result) {
        var error = new Error(result);
        error.name = 'DragAndDropError';
        throw error;
      }
    });
  });
};

module.exports = DragAndDrop;
