const app = require('ui/modules').get('kibana');
const Clipboard = require('clipboard');
const removeQueryStringValue = require('../lib/remove_query_string_value');

require('../styles/index.less');

app.directive('shareObjectUrl', function (Private, Notifier) {
  const urlShortener = Private(require('../lib/url_shortener'));

  return {
    restrict: 'E',
    scope: {
      getShareAsEmbed: '&shareAsEmbed',
      stripAppState: '='
    },
    template: require('ui/share/views/share_object_url.html'),
    link: function ($scope, $el) {
      const notify = new Notifier({
        location: `Share ${$scope.$parent.objectType}`
      });

      $scope.textbox = $el.find('input.url')[0];
      $scope.clipboardButton = $el.find('button.clipboard-button')[0];

      const clipboard = new Clipboard($scope.clipboardButton, {
        target: function (trigger) {
          return $scope.textbox;
        }
      });

      clipboard.on('success', function (e) {
        notify.info('URL copied to clipboard.');
        e.clearSelection();
      });

      clipboard.on('error', function (e) {
        notify.info('URL selected. Press Ctrl+C to copy.');
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

        $scope.generating = true;
        urlShortener.shortenUrl($scope.url)
        .then(shortUrl => {
          updateUrl(shortUrl);
          $scope.shortGenerated = true;
          $scope.generating = false;
        });
      };

      $scope.getUrl = function () {
        return $location.absUrl();
      };

      $scope.$watch('getUrl()', updateUrl);

      $scope.$watch('stripAppState', function (enabled) {
        const currentUrl = $scope.getUrl();
        if (enabled) {
          let newUrl = removeQueryStringValue(currentUrl, '_a');
          updateUrl(newUrl);
        } else {
          updateUrl(currentUrl);
        }
      });
    }
  };
});
