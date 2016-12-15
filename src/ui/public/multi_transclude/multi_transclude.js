import _ from 'lodash';
import angular from 'angular';
import uiModules from 'ui/modules';


const module = uiModules.get('kibana');

module.directive('multiTransclude', function MultiTransclude() {
  return {
    link: linkMultiTransclude,
    restrict: 'A',
    scope: {
      'multiTransclude': '=',
    },
  };
});

function linkMultiTransclude(scope, element, attrs, ctrl, transclude) {
  const transclusionSlotNames = scope.multiTransclude;
  const transcludes = {};

  transclude(clone => {
    // We expect the transcluded elements to be wrapped in a single div.
    const transcludedContentContainer = _.find(clone, item => {
      if (item.attributes) {
        return _.find(item.attributes, attr => {
          return attr.name.indexOf('data-transclude-slots') !== -1;
        });
      }
    });

    if (!transcludedContentContainer) {
      return;
    }

    const transcludedContent = transcludedContentContainer.children;
    _.forEach(transcludedContent, transcludedItem => {
      const transclusionSlot = transcludedItem.getAttribute('data-transclude-slot');
      transcludes[transclusionSlot] = transcludedItem;
    });
  });

  // Transclude elements into specified "slots" in the top nav.
  transclusionSlotNames.forEach(name => {
    const transcludedItem = transcludes[name];
    if (transcludedItem) {
      const transclusionSlot = document.querySelector(`[data-transclude-slot="${name}"]`);
      angular.element(transclusionSlot).append(transcludedItem);
    }
  });
}
