/* eslint-disable */

let isPopoverCollapsed = true;
let $toggleMenu = $('[data-id="toggleMenu"]')
let $toggleButton = $('[data-id="toggleButton"]')

$('[data-id="toggleButton"]').click(function() {

  if (isPopoverCollapsed) {
    $(this).addClass('isOpen');
  } else {
    $(this).removeClass('isOpen');
  }

  isPopoverCollapsed = !isPopoverCollapsed;
});

$(document).mouseup(function(e) {
  if (!isPopoverCollapsed && !$toggleMenu.is(e.target) && $toggleMenu.has(e.target).length === 0) {
    $toggleButton.removeClass('isOpen');
    isPopoverCollapsed = !isPopoverCollapsed;
  }
});/* eslint-disable */
