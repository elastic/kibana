import chrome from 'ui/chrome';

export default function createUrlShortener(Notifier, $http, $location) {
  const notify = new Notifier({
    location: 'Url Shortener'
  });
  const basePath = chrome.getBasePath();
  const baseUrl = `${$location.protocol()}://${$location.host()}:${$location.port()}${basePath}`;

  async function shortenUrl(url) {
    const relativeUrl = url.replace(baseUrl, '');
    const formData = { url: relativeUrl };

    try {
      const result = await $http.post(`${basePath}/shorten`, formData);

      return `${baseUrl}/goto/${result.data}`;
    } catch (err) {
      notify.error(err);
      throw err;
    }
  }

  return {
    shortenUrl
  };
};
