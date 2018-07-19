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

Kibana Test Harness uses the Page Object Model. This basically means that the objects that our tests interact are constructed as pages. When using these in the tests, we interact with instances of those objects. The navigation elements return instances of their corresponding Page Object. 

#### Page Objects

#### Component Objects

### Services

### Hooks 

## Review Process