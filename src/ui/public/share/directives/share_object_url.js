const app = require('ui/modules').get('kibana');
const Clipboard = require('clipboard');
const unhashUrl = require('ui/state_management/state_hashing').unhashUrl;
const getUnhashableStatesProvider = require('ui/state_management/state_hashing').getUnhashableStatesProvider;

require('../styles/index.less');

app.directive('shareObjectUrl', function (Private, Notifier) {
  const urlShortener = Private(require('../lib/url_shortener'));
  const getUnhashableStates = Private(getUnhashableStatesProvider);

  return {
    restrict: 'E',
    scope: {
      getShareAsEmbed: '&shareAsEmbed'
    },
    template: require('ui/share/views/share_object_url.html'),
    link: function ($scope, $el) {
      const notify = new Notifier({
        location: `Share ${$scope.$parent.objectType}`
      });

      $scope.textbox = $el.find('input.url')[0];
      $scope.clipboardButton = $el.find('button.clipboard-button')[0];

      const clipboard = new Clipboard($scope.clipboardButton, {
        target(trigger) {
          return $scope.textbox;
        }
      });

      clipboard.on('success', e => {
        notify.info('URL copied to clipboard.');
        e.clearSelection();
      });

      clipboard.on('error', () => {
        notify.info('URL selected. Press Ctrl+C to copy.');
      });

      $scope.$on('$destroy', () => {
        clipboard.destroy();
      });

      $scope.clipboard = clipboard;
    },
    controller: function ($scope, $location) {
      function updateUrl(url) {
        $scope.url = url;

        if ($scope.shareAsEmbed) {
          $scope.formattedUrl = `<iframe src="${$scope.url}" height="600" width="800"></iframe>`;
        } else {
          $scope.formattedUrl = $scope.url;
        }

        $scope.shortGenerated = false;
      }

      $scope.shareAsEmbed = $scope.getShareAsEmbed();

      $scope.generateShortUrl = function () {
        if ($scope.shortGenerated) return;

        urlShortener.shortenUrl($scope.url)
        .then(shortUrl => {
          updateUrl(shortUrl);
          $scope.shortGenerated = true;
        });
      };

      $scope.getUrl = function () {
        const urlWithHashes = $location.absUrl();
        const urlWithStates = unhashUrl(urlWithHashes, getUnhashableStates());

        if ($scope.shareAsEmbed) {
          return urlWithStates.replace('?', '?embed=true&');
        }

        return urlWithStates;
      };

      $scope.$watch('getUrl()', updateUrl);
    }
  };
});
