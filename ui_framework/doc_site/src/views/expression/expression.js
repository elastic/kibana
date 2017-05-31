/* eslint-disable */

let isPopoverCollapsed = true;
const $toggleExpressionButton = $('[data-id="toggleExpressionButton"]');
const $toggleExpressionPopover = $('[data-id="toggleExpressionPopover"]');

$toggleExpressionButton.on('click', () => {

  if (isPopoverCollapsed) {
    $toggleExpressionButton.addClass('kuiExpression__button--active');
    $toggleExpressionPopover.removeClass('kuiExpression__popover--hidden');
  } else {
    $toggleExpressionButton.removeClass('kuiExpression__button--active');
    $toggleExpressionPopover.addClass('kuiExpression__popover--hidden');
  }

  isPopoverCollapsed = !isPopoverCollapsed;
});

$(document).mouseup(function(e) {
  if (!isPopoverCollapsed && !$toggleExpressionPopover.is(e.target) && $toggleExpressionPopover.has(e.target).length === 0) {
    $toggleExpressionPopover.addClass('kuiExpression__popover--hidden');
    $toggleExpressionButton.removeClass('kuiExpression__button--active');
    isPopoverCollapsed = !isPopoverCollapsed;
  }
});

