# Kibana Test Harness

## Running Tests

### Production Command

`yarn test:ui:wdio`

### To Run Tests Without Restarting Servers

```sh
# In one terminal start the test server.
yarn test:ui:server
```
```sh
# In another terminal, run the tests:
npm run wdioTests
```

## Writing Tests

### Patterns

#### Page Object Model

##### Navigation

Kibana Test Harness uses the Page Object Model. This basically means that the objects that our tests interact are constructed as pages. When using these in the tests, we interact with instances of those objects. The navigation elements return instances of their corresponding Page Object. 

```javascript
this.driver.url('/');
this.homePage = new HomePage(this.driver);
this.consolePage = this.homePage.nav.navigateToConsole();
```

*NOTE*
Since navigating directly to the Home Page does not return an object, we create the instance ourselves. 

##### Driver
Typically, the driver being used is injected at the test level. But we need our objects to have access to the driver. We give these objects access by passing them into the constructor. 

With the prevalence of front-end frameworks making pages more dynamic and less reliant on full page loads, figuring out what constitutes a page object can be a challenge. 
A good rule of thumb is: If it needs a route, it's a page. Another is: If you were to make this site without the use of JavaScript, would you need an `.html` file? If so, it's likely a [page object](#Page-Objects). 

We are using a model called the [Page Object Model](https://martinfowler.com/bliki/PageObject.html) model in which functions, selectors and properties relevant to a specific web page are grouped into classes that can be called upon to reduce duplication and encourage code reuse.

##### Example - Without Page Objects 

`test_search.js`

```javascript
describe('Search Page', function(){
    it('Should search and return results', function() {
        
        const results = driver.findElements('#results > a');
        expect(results.length).toBeGreaterThan(0);
    });

    it('Should search and return no results', function() {
        driver.findElement('#searchbar').type(String('$#!@$#@!Kibana6$#@#%$%@$#^#@'));
        driver.click('#submitButton');
        driver.waitFor(function() {
            this.driver.isVisible('#results');
        })
        const results = driver.findElements('#results > a');
        expect(results.length).toBe(0);
    });
}); 
```

##### Example - With Page Objects

`test_search.js`

```javascript
describe('Search Page', function(){
    it('Should search and return results', function() {
        const searchPage = new SearchPage(driver);
        searchPage.submitSearch('Kibana');
        expect(searchPage.results.length).toBeGreaterThan(0);
    })

    it('Should search and return no results', function() {
        const searchPage = new SearchPage(driver);
        searchPage.submitSearch('$#!@$#@!Kibana6$#@#%$%@$#^#@');
        expect(searchPage.results.length).toBe(0);
    })
}) 
```

`search_page.js`
```javascript
export default class SearchPage {
    constructor(driver) {
        this.driver = driver;
        this.searchbarSelector = '#searchbar';
        this.submitButtonSelector = '#submitButton';
        this.resultsListSelector = '#results';
        this.resultsListItemSelector = `${this.resultsListSelector} > a`;
    }

    submitSeach(query) {
        this.driver.findElement(this.searcbarSelector).type(String(query));
        this.driver.click(this.submitButtonSelector);
        this.driver.waitFor(function() {
            this.driver.isVisible(this.resultsListSelector);
        })
    }

    get results() {
        return this.driver.findElements(this.resultsListItemSelector);
    }
}
```

##### Component Objects
What? Component objects? What's that?

There have been many conversations about `Page Objects` vs `Services` to address the problem of code reuse when it comes to things that need to be reused that aren't technically pages. (Thanks @gammon and @spalger). With the recent push to `Reactify` Kibana, I feel that it's only proper to do something similar for our test suite since it seems appropriate. 

**Enter Component Objects**

The concept of component objects (though unimplemented at this time in this framework) is simple. Instead of having these components extend `base_page.js` since they are not pages, it extends `web.js` because components only need access to webby parts. So we can create an object that has access to the abilities of web interactions, but are not pages in the sense that they don't need access to a title or navigation. These components will be self aware, containing their own selectors, actions and properties. They will be embeddable into page objects so that each page can have it's own instance of that component (just like it is in React). I think this should solve the issue around `page objects` vs `services` but other thoughts and feedback are welcome. 

##### FAQs

###### Question: Could we not have just used the before hook to abstract out some of the common pieces?

Like this:

```javascript
beforeAll() {
    driver.findElement('#searchbar').type(String('Kibana'));
        driver.click('#submitButton');
        driver.waitFor(function() {
            this.driver.isVisible('#results');
        })
}
```
*Answer: You could. But what if you need to reuse selectors across test files, apps, etc?*


###### Question: What about if we want to reuse code but is not a page? 

* See sections [componenet Objects](#Component-Objects) along with the [Abstractions](#Abstractions) section. 

### Abstractions

#### web.js

This file serves as our hook to whatever testing tool (i.e. WebdriverIO, LeadFoot, etc. ) we are using. All page objects, component objects eventually wind up extending this class. It is called `web.js` just in case we decide to tackle mobile testing in which case we would likely have something like a `mobile.js` to implement the differences from `web.js`. If we ever need to switch testing tools, we can always swap the implementation of our APIs in `web.js` leaving our page objects and tests unaffected. 

##### Supported APIs

`getElementText(selector)`

* Description
    * Gets the visible text for the element found
* Parameters
    * selector: {string} - CSS or XPATH selector for element 

`getCssPropertyValue(selector, property)`

* Description
    * Gets the value for the given HTML property
* Parameters
    * selector: {string} - CSS or XPATH selector for element 
    * property: {string} - HTML property to retrieve value for. 

`click(selector)`
* Description
    * Performs left click on element found
* Parameters
    * selector: {string} - CSS or XPATH selector for element 

`clear(selector)`
* Description
    * Clears the value for the element found.
* Parameters
    * selector: {string} - CSS or XPATH selector for element 

`findElement(selector)`
* Description
    * Returns the element found.
    * If multiple elements are found, throws error. 
* Parameters
    * selector: {string} - CSS or XPATH selector for element 

`findElements(selector)`
* Description
    * Returns an array of elements found.
* Parameters
    * selector: {string} - CSS or XPATH selector for element 

`type(selector, value, clear)`
* Description
    * Types the given value into the element found. 
* Parameters
    * selector: {string} - CSS or XPATH selector for element 
    * value: {string} - Value to type into the element.
    * clear: {boolean} - Whether or not to clear element before typing.

`exists(selector)`
* Description
    * Returns boolean for whether the element exists or not. 
* Parameters
    * selector: {string} - CSS or XPATH selector for element 

`isVisible(selector)`
* Description
    * Returns a boolean for whether or not the element is visible. 
* Parameters
    * selector: {string} - CSS or XPATH selector for element 

`isEnabled(selector)`
* Description
    * Returns a boolean for whether or not the element is enabled.
* Parameters
    * selector: {string} - CSS or XPATH selector for element 

`waitForVisible(selector)`
* Description
    * Wait for element to become visible.
* Parameters
    * selector: {string} - CSS or XPATH selector for element 

`waitForEnabled(selector)` 
* Description
    * Wait for element to become enabled. 
* Parameters
    * selector: {string} - CSS or XPATH selector for element 

`waitForExist(selector)` 
* Description
    * Wait for element to exist. 
* Parameters
    * selector: {string} - CSS or XPATH selector for element 

`waitForCondition(conditionFunc)`
* Description
    * Wait for a given condition to become true. 
* Parameters
    * conditionFunc: A function that will evaluate to true **DO NOT CALL THE FUNCTION**

#### base_page.js

This file adds a little more functionality that are specific to web pages.

##### Supported APIs

`title`
* Description
    * Gets the title for the page

##### To Be Implemented APIs
`refresh()`
* Description
    * Refreshes the web page. 


### Actions

### Properties

### Services

### Hooks 

## Review Process