# ML Kibana API routes

This folder contains ML API routes in Kibana.

Each route handler requires [apiDoc](https://github.com/apidoc/apidoc) annotations in order 
to generate documentation.
The [apidoc-markdown](https://github.com/rigwild/apidoc-markdown) package is also required in order to generate the markdown.

For now the process is pretty manual. You need to make sure the packages mentioned above are installed globally 
to execute the following command from the directory in which this README file is located.
```
apidoc -i . -o ../routes_doc && apidoc-markdown -p ../routes_doc -o ../routes_doc/ML_API.md 
```

It will create a new directory `routes_doc` (next to the `routes` folder) which contains the documentation in HTML format 
as well as `ML_API.md` file.