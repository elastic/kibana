/* eslint-disable */

let isPopoverCollapsed = true;
const $toggleExpressionButton = $('[data-id="toggleExpressionButton"]');
const $toggleExpressionPopover = $('[data-id="toggleExpressionPopover"]');

$('[data-id="toggleExpressionButton"]').click(function() {

  if (isPopoverCollapsed) {
    $(this).addClass('kuiExpression__button--active')
    $(this).parent( "div" ).find('[data-id="toggleExpressionPopover"]').removeClass('kuiExpression__popover--hidden');
  } else {
    $(this).removeClass('kuiExpression__button--active')
    $(this).parent( "div" ).find('[data-id="toggleExpressionPopover"]').addClass('kuiExpression__popover--hidden');
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
