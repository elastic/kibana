/* eslint-disable @kbn/eslint/require-license-header */

/* @notice
 * Based on the scroll-into-view-if-necessary module from npm
 * https://github.com/stipsan/compute-scroll-into-view/blob/master/src/index.ts#L269-L340
 *
 * MIT License
 *
 * Copyright (c) 2018 Cody Olsen
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

export function scrollIntoViewIfNecessary(target, fixedHeaderHeight) {
  var rootScroller = document.scrollingElement || document.documentElement;
  if (!rootScroller) {
    throw new Error('Unable to find document.scrollingElement or document.documentElement');
  }

  var rootRect = rootScroller.getBoundingClientRect();
  var targetRect = target.getBoundingClientRect();

  var viewportHeight = window.visualViewport ? visualViewport.height : window.innerHeight;

  var viewportWidth = window.visualViewport ? visualViewport.width : window.innerWidth;

  function isInView() {
    return (
      targetRect.top >= 0 &&
      targetRect.left >= 0 &&
      targetRect.bottom <= viewportHeight &&
      targetRect.right <= viewportWidth &&
      targetRect.top >= rootRect.top &&
      targetRect.bottom <= rootRect.bottom &&
      targetRect.left >= rootRect.left &&
      targetRect.right <= rootRect.right
    );
  }

  if (!isInView()) {
    target.scrollIntoView();
  }

  var boundingRect = target.getBoundingClientRect();
  var additionalScrollNecessary = fixedHeaderHeight - boundingRect.top;

  if (additionalScrollNecessary > 0) {
    rootScroller.scrollTop = rootScroller.scrollTop - additionalScrollNecessary;
  }
}
