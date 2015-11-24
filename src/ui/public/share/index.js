define(function (require) {
  const app = require('ui/modules').get('kibana/share');

  app.directive('share', function (Private) {
    const urlShortener = Private(require('./url_shortener'));

    return {
      restrict: 'E',
      scope: { objectType: '@' },
      template: require('ui/share/index.html'),
      controller: function ($scope, $rootScope, $location, $http) {
        $scope.shortUrlsLoading = false;

        $scope.$watch('getUrl()', function (url) {
          $scope.url = url;
          $scope.embedUrl = url.replace('?', '?embed&');

          //when the url changes we want to hide any generated short urls
          $scope.shortenUrls = false;
          $scope.shortUrl = undefined;
        });

        $scope.$watch('shortenUrls', enabled => {
          if (!!enabled) {
            if ($scope.shortUrl) {
              $scope.shortUrlsLoading = false;
            } else {
              $scope.shortUrlsLoading = true;

              const linkPromise = urlShortener.shortenUrl($scope.url)
              .then(shortUrl => {
                $scope.shortUrl = shortUrl;
              });

              const embedPromise = urlShortener.shortenUrl($scope.embedUrl)
              .then(shortUrl => {
                $scope.shortEmbedUrl = shortUrl;
              });

              Promise.all([linkPromise, embedPromise])
              .then(() => {
                $scope.shortUrlsLoading = false;
              })
              .catch(err => {
                $scope.shortenUrls = false;
              });
            }
          }
        });

        $scope.getUrl = function () {
          return $location.absUrl();
        };
      }
    };
  });
});
