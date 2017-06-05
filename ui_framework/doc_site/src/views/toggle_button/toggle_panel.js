/* eslint-disable */

let isButtonCollapsed = true;
const $togglePanelButton = $('[data-id="togglePanelButton"]');
const $togglePanelButtonIcon = $('[data-id="togglePanelButtonIcon"]');
const $togglePanelContent = $('[data-id="togglePanelContent"]');

$togglePanelButton.on('click', () => {
  isButtonCollapsed = !isButtonCollapsed;

  if (isButtonCollapsed) {
    $togglePanelButtonIcon.addClass('fa-caret-right');
    $togglePanelButtonIcon.removeClass('fa-caret-down');
    $togglePanelContent.hide();
  } else {
    $togglePanelButtonIcon.removeClass('fa-caret-right');
    $togglePanelButtonIcon.addClass('fa-caret-down');
    $togglePanelContent.show();
  }
});

$togglePanelContent.hide();
