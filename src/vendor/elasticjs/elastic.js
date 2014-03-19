/*! elastic.js - v1.1.1 - 2014-03-21
 * https://github.com/fullscale/elastic.js
 * Copyright (c) 2014 FullScale Labs, LLC; Licensed MIT */

/**
 @namespace
 @name ejs
 @desc All elastic.js modules are organized under the ejs namespace.
 */
(function () {
  'use strict';

  var

    // save reference to global object
    // `window` in browser
    // `exports` on server
    root = this,

    // save the previous version of ejs
    _ejs = root && root.ejs,

    // from underscore.js, used in utils
    ArrayProto = Array.prototype,
    ObjProto = Object.prototype,
    slice = ArrayProto.slice,
    toString = ObjProto.toString,
    hasOwnProp = ObjProto.hasOwnProperty,
    nativeForEach = ArrayProto.forEach,
    nativeIsArray = Array.isArray,
    nativeIndexOf = ArrayProto.indexOf,
    breaker = {},
    has,
    each,
    extend,
    indexOf,
    isArray,
    isObject,
    isString,
    isNumber,
    isBoolean,
    isFunction,
    isEJSObject, // checks if valid ejs object
    isQuery, // checks valid ejs Query object
    isRescore, // checks valid ejs Rescore object
    isFilter, // checks valid ejs Filter object
    isFacet, // checks valid ejs Facet object
    isAggregation, // checks valid ejs Aggregation object
    isScriptField, // checks valid ejs ScriptField object
    isGeoPoint, // checks valid ejs GeoPoint object
    isIndexedShape, // checks valid ejs IndexedShape object
    isShape, // checks valid ejs Shape object
    isSort, // checks valid ejs Sort object
    isHighlight, // checks valid ejs Highlight object
    isSuggest, // checks valid ejs Suggest object
    isGenerator, // checks valid ejs Generator object
    isScoreFunction, // checks valid ejs ScoreFunction object

    // create ejs object
    ejs;

  if (typeof exports !== 'undefined') {
    ejs = exports;
  } else {
    ejs = root.ejs = {};
  }

  /* Utility methods, most of which are pulled from underscore.js. */

  // Shortcut function for checking if an object has a given property directly
  // on itself (in other words, not on a prototype).
  has = function (obj, key) {
    return hasOwnProp.call(obj, key);
  };

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles objects with the built-in `forEach`, arrays, and raw objects.
  // Delegates to **ECMAScript 5**'s native `forEach` if available.
  each = function (obj, iterator, context) {
    if (obj == null) {
      return;
    }
    if (nativeForEach && obj.forEach === nativeForEach) {
      obj.forEach(iterator, context);
    } else if (obj.length === +obj.length) {
      for (var i = 0, l = obj.length; i < l; i++) {
        if (iterator.call(context, obj[i], i, obj) === breaker) {
          return;
        }
      }
    } else {
      for (var key in obj) {
        if (has(obj, key)) {
          if (iterator.call(context, obj[key], key, obj) === breaker) {
            return;
          }
        }
      }
    }
  };

  // Extend a given object with all the properties in passed-in object(s).
  extend = function (obj) {
    each(slice.call(arguments, 1), function (source) {
      for (var prop in source) {
        obj[prop] = source[prop];
      }
    });
    return obj;
  };

  // Returns the index at which value can be found in the array, or -1 if
  // value is not present in the array.
  indexOf = function (array, item) {
    if (array == null) {
      return -1;
    }

    var i = 0, l = array.length;
    if (nativeIndexOf && array.indexOf === nativeIndexOf) {
      return array.indexOf(item);
    }

    for (; i < l; i++) {
      if (array[i] === item) {
        return i;

      }
    }

    return -1;
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  // switched to ===, not sure why underscore used ==
  isArray = nativeIsArray || function (obj) {
    return toString.call(obj) === '[object Array]';
  };

  // Is a given variable an object?
  isObject = function (obj) {
    return obj === Object(obj);
  };

  // switched to ===, not sure why underscore used ==
  isString = function (obj) {
    return toString.call(obj) === '[object String]';
  };

  // switched to ===, not sure why underscore used ==
  isNumber = function (obj) {
    return toString.call(obj) === '[object Number]';
  };

  isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) === '[object Boolean]';
  };

  // switched to ===, not sure why underscore used ==
  if (typeof (/./) !== 'function') {
    isFunction = function (obj) {
      return typeof obj === 'function';
    };
  } else {
    isFunction = function (obj) {
      return toString.call(obj) === '[object Function]';
    };
  }

  // Is a given value an ejs object?
  // Yes if object and has "_type", "toJSON", and "toString" properties
  isEJSObject = function (obj) {
    return (isObject(obj) &&
      has(obj, '_type') &&
      has(obj, 'toJSON'));
  };

  isQuery = function (obj) {
    return (isEJSObject(obj) && obj._type() === 'query');
  };

  isRescore = function (obj) {
    return (isEJSObject(obj) && obj._type() === 'rescore');
  };

  isFilter = function (obj) {
    return (isEJSObject(obj) && obj._type() === 'filter');
  };

  isFacet = function (obj) {
    return (isEJSObject(obj) && obj._type() === 'facet');
  };

  isAggregation = function (obj) {
    return (isEJSObject(obj) && obj._type() === 'aggregation');
  };

  isScriptField = function (obj) {
    return (isEJSObject(obj) && obj._type() === 'script field');
  };

  isGeoPoint = function (obj) {
    return (isEJSObject(obj) && obj._type() === 'geo point');
  };

  isIndexedShape = function (obj) {
    return (isEJSObject(obj) && obj._type() === 'indexed shape');
  };

  isShape = function (obj) {
    return (isEJSObject(obj) && obj._type() === 'shape');
  };

  isSort = function (obj) {
    return (isEJSObject(obj) && obj._type() === 'sort');
  };

  isHighlight = function (obj) {
    return (isEJSObject(obj) && obj._type() === 'highlight');
  };

  isSuggest = function (obj) {
    return (isEJSObject(obj) && obj._type() === 'suggest');
  };

  isGenerator = function (obj) {
    return (isEJSObject(obj) && obj._type() === 'generator');
  };

  isScoreFunction = function (obj) {
    return (isEJSObject(obj) && obj._type() === 'score function');
  };

  /**
    @mixin
    <p>The AggregationMixin provides support for common options used across
    various <code>Aggregation</code> implementations.  This object should not be
    used directly.</p>

    @name ejs.AggregationMixin
    */
  ejs.AggregationMixin = function (name) {

    var aggs = {};
    aggs[name] = {};

    return {

      /**
      Add a nesated aggregation.  This method can be called multiple times
      in order to set multiple nested aggregations what will be executed
      at the same time as the parent aggregation.

      @member ejs.AggregationMixin
      @param {Aggregation} agg Any valid <code>Aggregation</code> object.
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      aggregation: function(agg) {
        if (agg == null) {
          return aggs[name].aggs;
        }

        if (aggs[name].aggs == null) {
          aggs[name].aggs = {};
        }

        if (!isAggregation(agg)) {
          throw new TypeError('Argument must be an Aggregation');
        }

        extend(aggs[name].aggs, agg.toJSON());

        return this;
      },

      /**
      Add a nesated aggregation.  This method can be called multiple times
      in order to set multiple nested aggregations what will be executed
      at the same time as the parent aggregation.  Alias for the
      aggregation method.

      @member ejs.AggregationMixin
      @param {Aggregation} agg Any valid <code>Aggregation</code> object.
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      agg: function(agg) {
        return this.aggregation(agg);
      },

      /**
            The type of ejs object.  For internal use only.

            @member ejs.AggregationMixin
            @returns {String} the type of object
            */
      _type: function () {
        return 'aggregation';
      },

      /**
            <p>Retrieves the internal <code>agg</code> object. This is typically used by
               internal API functions so use with caution.</p>

            @member ejs.AggregationMixin
            @returns {String} returns this object's internal object.
            */
      toJSON: function () {
        return aggs;
      }

    };
  };

  /**
    @mixin
    <p>The DirectSettingsMixin provides support for common options used across 
    various <code>Suggester</code> implementations.  This object should not be 
    used directly.</p>

    @name ejs.DirectSettingsMixin
  
    @param {String} settings The object to set the options on.
    */
  ejs.DirectSettingsMixin = function (settings) {

    return {
        
      /**
            <p>Sets the accuracy.  How similar the suggested terms at least 
            need to be compared to the original suggest text.</p>

            @member ejs.DirectSettingsMixin
            @param {Double} a A positive double value between 0 and 1.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      accuracy: function (a) {
        if (a == null) {
          return settings.accuracy;
        }
  
        settings.accuracy = a;
        return this;
      },
    
      /**
            <p>Sets the suggest mode.  Valid values are:</p>

            <dl>
              <dd><code>missing</code> - Only suggest terms in the suggest text that aren't in the index</dd>
              <dd><code>popular</code> - Only suggest suggestions that occur in more docs then the original suggest text term</dd>
              <dd><code>always</code> - Suggest any matching suggestions based on terms in the suggest text</dd> 
            </dl>

            @member ejs.DirectSettingsMixin
            @param {String} m The mode of missing, popular, or always.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      suggestMode: function (m) {
        if (m == null) {
          return settings.suggest_mode;
        }
  
        m = m.toLowerCase();
        if (m === 'missing' || m === 'popular' || m === 'always') {
          settings.suggest_mode = m;
        }
      
        return this;
      },
    
      /**
            <p>Sets the sort mode.  Valid values are:</p>

            <dl>
              <dd><code>score</code> - Sort by score first, then document frequency, and then the term itself</dd>
              <dd><code>frequency</code> - Sort by document frequency first, then simlarity score and then the term itself</dd>
            </dl>

            @member ejs.DirectSettingsMixin
            @param {String} s The score type of score or frequency.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      sort: function (s) {
        if (s == null) {
          return settings.sort;
        }
  
        s = s.toLowerCase();
        if (s === 'score' || s === 'frequency') {
          settings.sort = s;
        }
      
        return this;
      },
    
      /**
            <p>Sets what string distance implementation to use for comparing 
            how similar suggested terms are.  Valid values are:</p>

            <dl>
              <dd><code>internal</code> - based on damerau_levenshtein but but highly optimized for comparing string distance for terms inside the index</dd>
              <dd><code>damerau_levenshtein</code> - String distance algorithm based on Damerau-Levenshtein algorithm</dd>
              <dd><code>levenstein</code> - String distance algorithm based on Levenstein edit distance algorithm</dd>
              <dd><code>jarowinkler</code> - String distance algorithm based on Jaro-Winkler algorithm</dd>
              <dd><code>ngram</code> - String distance algorithm based on character n-grams</dd>
            </dl>

            @member ejs.DirectSettingsMixin
            @param {String} s The string distance algorithm name.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      stringDistance: function (s) {
        if (s == null) {
          return settings.string_distance;
        }
  
        s = s.toLowerCase();
        if (s === 'internal' || s === 'damerau_levenshtein' || 
            s === 'levenstein' || s === 'jarowinkler' || s === 'ngram') {
          settings.string_distance = s;
        }
      
        return this;
      },
    
      /**
            <p>Sets the maximum edit distance candidate suggestions can have 
            in order to be considered as a suggestion.</p>

            @member ejs.DirectSettingsMixin
            @param {Integer} max An integer value greater than 0.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      maxEdits: function (max) {
        if (max == null) {
          return settings.max_edits;
        }
  
        settings.max_edits = max;
        return this;
      },
    
      /**
            <p>The factor that is used to multiply with the size in order 
            to inspect more candidate suggestions.</p>

            @member ejs.DirectSettingsMixin
            @param {Integer} max A positive integer value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      maxInspections: function (max) {
        if (max == null) {
          return settings.max_inspections;
        }
  
        settings.max_inspections = max;
        return this;
      },
    
      /**
            <p>Sets a maximum threshold in number of documents a suggest text 
            token can exist in order to be corrected.</p>

            @member ejs.DirectSettingsMixin
            @param {Double} max A positive double value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      maxTermFreq: function (max) {
        if (max == null) {
          return settings.max_term_freq;
        }
  
        settings.max_term_freq = max;
        return this;
      },
    
      /**
            <p>Sets the number of minimal prefix characters that must match in 
            order be a candidate suggestion.</p>

            @member ejs.DirectSettingsMixin
            @param {Integer} len A positive integer value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      prefixLen: function (len) {
        if (len == null) {
          return settings.prefix_len;
        }
  
        settings.prefix_len = len;
        return this;
      },
    
      /**
            <p>Sets the minimum length a suggest text term must have in order 
            to be corrected.</p>

            @member ejs.DirectSettingsMixin
            @param {Integer} len A positive integer value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      minWordLen: function (len) {
        if (len == null) {
          return settings.min_word_len;
        }
  
        settings.min_word_len = len;
        return this;
      },
    
      /**
            <p>Sets a minimal threshold of the number of documents a suggested 
            term should appear in.</p>

            @member ejs.DirectSettingsMixin
            @param {Double} min A positive double value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      minDocFreq: function (min) {
        if (min == null) {
          return settings.min_doc_freq;
        }
  
        settings.min_doc_freq = min;
        return this;
      }
      
    };
  };

  /**
    @mixin
    <p>The FacetMixin provides support for common options used across 
    various <code>Facet</code> implementations.  This object should not be 
    used directly.</p>

    @name ejs.FacetMixin
    */
  ejs.FacetMixin = function (name) {

    var facet = {};
    facet[name] = {};
    
    return {
    
      /**
            <p>Allows you to reduce the documents used for computing facet results.</p>

            @member ejs.FacetMixin
            @param {Object} oFilter A valid <code>Filter</code> object.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      facetFilter: function (oFilter) {
        if (oFilter == null) {
          return facet[name].facet_filter;
        }
      
        if (!isFilter(oFilter)) {
          throw new TypeError('Argument must be a Filter');
        }
        
        facet[name].facet_filter = oFilter.toJSON();
        return this;
      },

      /**
            <p>Computes values across the entire index</p>

            @member ejs.FacetMixin
            @param {Boolean} trueFalse Calculate facet counts globally or not.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      global: function (trueFalse) {
        if (trueFalse == null) {
          return facet[name].global;
        }
        
        facet[name].global = trueFalse;
        return this;
      },
      
      /**
            <p>Sets the mode the facet will use.<p>
            
            <dl>
                <dd><code>collector</code></dd>
                <dd><code>post</code></dd>
            <dl>
            
            @member ejs.FacetMixin
            @param {String} m The mode: collector or post.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      mode: function (m) {
        if (m == null) {
          return facet[name].mode;
        }
      
        m = m.toLowerCase();
        if (m === 'collector' || m === 'post') {
          facet[name].mode = m;
        }
        
        return this;
      },
      
      /**
            <p>Enables caching of the <code>facetFilter</code></p>

            @member ejs.FacetMixin
            @param {Boolean} trueFalse If the facetFilter should be cached or not
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      cacheFilter: function (trueFalse) {
        if (trueFalse == null) {
          return facet[name].cache_filter;
        }
        
        facet[name].cache_filter = trueFalse;
        return this;
      },
      
      /**
            <p>Computes values across the the specified scope</p>

            @deprecated since elasticsearch 0.90
            @member ejs.FacetMixin
            @param {String} scope The scope name to calculate facet counts with.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      scope: function (scope) {
        return this;
      },
      
      /**
            <p>Sets the path to the nested document if faceting against a
            nested field.</p>

            @member ejs.FacetMixin
            @param {String} path The nested path
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      nested: function (path) {
        if (path == null) {
          return facet[name].nested;
        }
        
        facet[name].nested = path;
        return this;
      },

      /**
            The type of ejs object.  For internal use only.
            
            @member ejs.FacetMixin
            @returns {String} the type of object
            */
      _type: function () {
        return 'facet';
      },
      
      /**
            <p>Retrieves the internal <code>facet</code> object. This is typically used by
               internal API functions so use with caution.</p>

            @member ejs.FacetMixin
            @returns {String} returns this object's internal <code>facet</code> property.
            */
      toJSON: function () {
        return facet;
      }
      
    };
  };

  /**
    @mixin
    <p>The FilterMixin provides support for common options used across 
    various <code>Filter</code> implementations.  This object should not be 
    used directly.</p>

    @name ejs.FilterMixin
    */
  ejs.FilterMixin = function (type) {

    var filter = {};
    filter[type] = {};

    return {

      /**
            Sets the filter name.

            @member ejs.FilterMixin
            @param {String} name A name for the filter.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      name: function (name) {
        if (name == null) {
          return filter[type]._name;
        }

        filter[type]._name = name;
        return this;
      },

      /**
            Enable or disable caching of the filter

            @member ejs.FilterMixin
            @param {Boolean} trueFalse True to cache the filter, false otherwise.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      cache: function (trueFalse) {
        if (trueFalse == null) {
          return filter[type]._cache;
        }

        filter[type]._cache = trueFalse;
        return this;
      },

      /**
            Sets the cache key.

            @member ejs.FilterMixin
            @param {String} key the cache key as a string.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      cacheKey: function (key) {
        if (key == null) {
          return filter[type]._cache_key;
        }

        filter[type]._cache_key = key;
        return this;
      },

      /**
            The type of ejs object.  For internal use only.
          
            @member ejs.FilterMixin
            @returns {String} the type of object
            */
      _type: function () {
        return 'filter';
      },
    
      /**
             Returns the filter object.

             @member ejs.FilterMixin
             @returns {Object} filter object
             */
      toJSON: function () {
        return filter;
      }
    
    };
  };

  /**
    @mixin
    <p>The MetricsAggregationMixin provides support for common options used across
    various metrics <code>Aggregation</code> implementations.  This object should
    not be used directly.</p>

    @name ejs.MetricsAggregationMixin
    @ejs aggregation
    @borrows ejs.AggregationMixin._type as _type
    @borrows ejs.AggregationMixin.toJSON as toJSON

    */
  ejs.MetricsAggregationMixin = function (name, type) {

    var
      _common = ejs.AggregationMixin(name),
      agg = _common.toJSON();

    // remove ability for sub-aggregations since metrics aggregations dont
    // support them.
    delete _common.aggregation;
    delete _common.agg;

    agg[name][type] = {};

    return extend(_common, {

      /**
      <p>Sets the field to operate on.</p>

      @member ejs.MetricsAggregationMixin
      @param {String} field a valid field name..
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      field: function (field) {
        if (field == null) {
          return agg[name][type].field;
        }

        agg[name][type].field = field;
        return this;
      },

      /**
      Allows you generate or modify the terms/values using a script.

      @member ejs.MetricsAggregationMixin
      @param {String} scriptCode A valid script string to execute.
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      script: function (scriptCode) {
        if (scriptCode == null) {
          return agg[name][type].script;
        }

        agg[name][type].script = scriptCode;
        return this;
      },

      /**
      The script language being used.

      @member ejs.MetricsAggregationMixin
      @param {String} language The language of the script.
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      lang: function (language) {
        if (language == null) {
          return agg[name][type].lang;
        }

        agg[name][type].lang = language;
        return this;
      },

      /**
      Set to true to assume script values are sorted.

      @member ejs.MetricsAggregationMixin
      @param {Boolean} trueFalse assume sorted values or not
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      scriptValuesSorted: function (trueFalse) {
        if (trueFalse == null) {
          return agg[name][type].script_values_sorted;
        }

        agg[name][type].script_values_sorted = trueFalse;
        return this;
      },

      /**
      Sets parameters that will be applied to the script.  Overwrites
      any existing params.

      @member ejs.MetricsAggregationMixin
      @param {Object} p An object where the keys are the parameter name and
        values are the parameter value.
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      params: function (p) {
        if (p == null) {
          return agg[name][type].params;
        }

        agg[name][type].params = p;
        return this;
      }

    });
  };

  /**
    @mixin
    <p>The QueryMixin provides support for common options used across 
    various <code>Query</code> implementations.  This object should not be 
    used directly.</p>

    @name ejs.QueryMixin
    */
  ejs.QueryMixin = function (type) {

    var query = {};
    query[type] = {};

    return {

      /**
            Sets the boost value for documents matching the <code>Query</code>.

            @member ejs.QueryMixin
            @param {Double} boost A positive <code>double</code> value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      boost: function (boost) {
        if (boost == null) {
          return query[type].boost;
        }

        query[type].boost = boost;
        return this;
      },
    
      /**
            The type of ejs object.  For internal use only.
          
            @member ejs.QueryMixin
            @returns {String} the type of object
            */
      _type: function () {
        return 'query';
      },
    
      /**
            Retrieves the internal <code>query</code> object. This is typically used by
            internal API functions so use with caution.

            @member ejs.QueryMixin
            @returns {String} returns this object's internal <code>query</code> property.
            */
      toJSON: function () {
        return query;
      }
  
    };
  };

  /**
    @mixin
    <p>The ScoreFunctionMixin provides support for common options used across
    various <code>ScoreFunction</code> implementations.  This object should not be
    used directly.</p>

    @name ejs.ScoreFunctionMixin
    */
  ejs.ScoreFunctionMixin = function (name) {

    var func = {};
    func[name] = {};

    return {

      /**
      Adds a filter whose matching documents will have the score function applied.

      @member ejs.ScoreFunctionMixin
      @param {Filter} oFilter Any valid <code>Filter</code> object.
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      filter: function(oFilter) {
        if (oFilter == null) {
          return func.filter;
        }

        if (!isFilter(oFilter)) {
          throw new TypeError('Argument must be a Filter');
        }

        func.filter = oFilter.toJSON();
        return this;
      },

      /**
      The type of ejs object.  For internal use only.

      @member ejs.ScoreFunctionMixin
      @returns {String} the type of object
      */
      _type: function () {
        return 'score function';
      },

      /**
      <p>Retrieves the internal <code>agg</code> object. This is typically used by
         internal API functions so use with caution.</p>

      @member ejs.ScoreFunctionMixin
      @returns {String} returns this object's internal object.
      */
      toJSON: function () {
        return func;
      }

    };
  };

  /**
    @mixin
    <p>The SuggestContextMixin provides support for suggest context settings 
    across various <code>Suggester</code> implementations.  This object should not be 
    used directly.</p>

    @name ejs.SuggestContextMixin
  
    @param {String} settings The object to set the options on.
    */
  ejs.SuggestContextMixin = function (settings) {

    return {
    
      /**
            <p>Sets analyzer used to analyze the suggest text.</p>

            @member ejs.SuggestContextMixin
            @param {String} analyzer A valid analyzer name.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      analyzer: function (analyzer) {
        if (analyzer == null) {
          return settings.analyzer;
        }
  
        settings.analyzer = analyzer;
        return this;
      },
    
      /**
            <p>Sets the field used to generate suggestions from.</p>

            @member ejs.SuggestContextMixin
            @param {String} field A valid field name.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      field: function (field) {
        if (field == null) {
          return settings.field;
        }
  
        settings.field = field;
        return this;
      },
    
      /**
            <p>Sets the number of suggestions returned for each token.</p>

            @member ejs.SuggestContextMixin
            @param {Integer} s A positive integer value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      size: function (s) {
        if (s == null) {
          return settings.size;
        }
  
        settings.size = s;
        return this;
      },
    
      /**
            <p>Sets the maximum number of suggestions to be retrieved from 
            each individual shard.</p>

            @member ejs.SuggestContextMixin
            @param {Integer} s A positive integer value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      shardSize: function (s) {
        if (s == null) {
          return settings.shard_size;
        }
  
        settings.shard_size = s;
        return this;
      }
      
    };
  };

  /**
    @mixin
    <p>The SuggesterMixin provides support for the base setting of all suggesters. 
    This object should not be used directly.</p>

    @name ejs.SuggesterMixin
  
    @param {String} name The name of the suggester.
    */
  ejs.SuggesterMixin = function (name) {
  
    var suggest = {};
    suggest[name] = {};

    return {
  
      /**
            <p>Sets the text to get suggestions for.  If not set, the global
            suggestion text will be used.</p>

            @member ejs.SuggesterMixin
            @param {String} txt A string to get suggestions for.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      text: function (txt) {
        if (txt == null) {
          return suggest[name].text;
        }
  
        suggest[name].text = txt;
        return this;
      },
  
      /**
            The type of ejs object.  For internal use only.
        
            @member ejs.SuggesterMixin
            @returns {String} the type of object
            */
      _type: function () {
        return 'suggest';
      },
  
      /**
            <p>Retrieves the internal <code>suggest</code> object. This is typically used by
               internal API functions so use with caution.</p>

            @member ejs.SuggesterMixin
            @returns {String} returns this object's internal <code>suggest</code> property.
            */
      toJSON: function () {
        return suggest;
      }
    
    };
  };

  /**
    @class
    <p>The DateHistogram facet works with time-based values by building a histogram across time
       intervals of the <code>value</code> field. Each value is <em>rounded</em> into an interval (or
       placed in a bucket), and statistics are provided per interval/bucket (count and total).</p>

    <p>Facets are similar to SQL <code>GROUP BY</code> statements but perform much
       better. You can also construct several <em>"groups"</em> at once by simply
       specifying multiple facets.</p>

    <div class="alert-message block-message info">
        <p>
            <strong>Tip: </strong>
            For more information on faceted navigation, see
            <a href="http://en.wikipedia.org/wiki/Faceted_classification">this</a>
            Wikipedia article on Faceted Classification.
        </p>
    </div>

    @name ejs.DateHistogramFacet
    @ejs facet
    @borrows ejs.FacetMixin.facetFilter as facetFilter
    @borrows ejs.FacetMixin.global as global
    @borrows ejs.FacetMixin.mode as mode
    @borrows ejs.FacetMixin.cacheFilter as cacheFilter
    @borrows ejs.FacetMixin.scope as scope
    @borrows ejs.FacetMixin.nested as nested
    @borrows ejs.FacetMixin._type as _type
    @borrows ejs.FacetMixin.toJSON as toJSON
  
    @desc
    <p>A facet which returns the N most frequent terms within a collection
       or set of collections.</p>

    @param {String} name The name which be used to refer to this facet. For instance,
        the facet itself might utilize a field named <code>doc_authors</code>. Setting
        <code>name</code> to <code>Authors</code> would allow you to refer to the
        facet by that name, possibly simplifying some of the display logic.

    */
  ejs.DateHistogramFacet = function (name) {

    var  
      _common = ejs.FacetMixin(name),
      facet = _common.toJSON();

    facet[name].date_histogram = {};

    return extend(_common, {

      /**
            Sets the field to be used to construct the this facet.

            @member ejs.DateHistogramFacet
            @param {String} fieldName The field name whose data will be used to construct the facet.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      field: function (fieldName) {
        if (fieldName == null) {
          return facet[name].date_histogram.field;
        }
      
        facet[name].date_histogram.field = fieldName;
        return this;
      },

      /**
            Allows you to specify a different key field to be used to group intervals.

            @member ejs.DateHistogramFacet
            @param {String} fieldName The name of the field to be used.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      keyField: function (fieldName) {
        if (fieldName == null) {
          return facet[name].date_histogram.key_field;
        }
      
        facet[name].date_histogram.key_field = fieldName;
        return this;
      },
      
      /**
            Allows you to specify a different value field to aggrerate over.

            @member ejs.DateHistogramFacet
            @param {String} fieldName The name of the field to be used.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      valueField: function (fieldName) {
        if (fieldName == null) {
          return facet[name].date_histogram.value_field;
        }
      
        facet[name].date_histogram.value_field = fieldName;
        return this;
      },
      
      /**
            Sets the bucket interval used to calculate the distribution.

            @member ejs.DateHistogramFacet
            @param {String} timeInterval The bucket interval. Valid values are <code>year, month, week, day, hour,</code> and <code>minute</code>.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      interval: function (timeInterval) {
        if (timeInterval == null) {
          return facet[name].date_histogram.interval;
        }
      
        facet[name].date_histogram.interval = timeInterval;
        return this;
      },

      /**
            <p>By default, time values are stored in UTC format.<p> 

            <p>This method allows users to set a time zone value that is then used 
            to compute intervals before rounding on the interval value. Equalivent to 
            <coe>preZone</code>.  Use <code>preZone</code> if possible. The 
            value is an offset from UTC.<p>
            
            <p>For example, to use EST you would set the value to <code>-5</code>.</p>

            @member ejs.DateHistogramFacet
            @param {Integer} tz An offset value from UTC.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      timeZone: function (tz) {
        if (tz == null) {
          return facet[name].date_histogram.time_zone;
        }
      
        facet[name].date_histogram.time_zone = tz;
        return this;
      },

      /**
            <p>By default, time values are stored in UTC format.<p> 

            <p>This method allows users to set a time zone value that is then used to 
            compute intervals before rounding on the interval value.  The value is an 
            offset from UTC.<p>
            
            <p>For example, to use EST you would set the value to <code>-5</code>.</p>

            @member ejs.DateHistogramFacet
            @param {Integer} tz An offset value from UTC.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      preZone: function (tz) {
        if (tz == null) {
          return facet[name].date_histogram.pre_zone;
        }
      
        facet[name].date_histogram.pre_zone = tz;
        return this;
      },
      
      /**
            <p>Enables large date interval conversions (day and up).</p>  

            <p>Set to true to enable and then set the <code>interval</code> to an 
            interval greater than a day.</p>
            
            @member ejs.DateHistogramFacet
            @param {Boolean} trueFalse A valid boolean value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      preZoneAdjustLargeInterval: function (trueFalse) {
        if (trueFalse == null) {
          return facet[name].date_histogram.pre_zone_adjust_large_interval;
        }
      
        facet[name].date_histogram.pre_zone_adjust_large_interval = trueFalse;
        return this;
      },
      
      /**
            <p>By default, time values are stored in UTC format.<p> 

            <p>This method allows users to set a time zone value that is then used to compute 
            intervals after rounding on the interval value.  The value is an offset from UTC.  
            The tz offset value is simply added to the resulting bucket's date value.<p>
            
            <p>For example, to use EST you would set the value to <code>-5</code>.</p>

            @member ejs.DateHistogramFacet
            @param {Integer} tz An offset value from UTC.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      postZone: function (tz) {
        if (tz == null) {
          return facet[name].date_histogram.post_zone;
        }
      
        facet[name].date_histogram.post_zone = tz;
        return this;
      },

      /**
            Set's a specific pre-rounding offset.  Format is 1d, 1h, etc.

            @member ejs.DateHistogramFacet
            @param {String} offset The offset as a string (1d, 1h, etc)
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      preOffset: function (offset) {
        if (offset == null) {
          return facet[name].date_histogram.pre_offset;
        }
      
        facet[name].date_histogram.pre_offset = offset;
        return this;
      },
      
      /**
            Set's a specific post-rounding offset.  Format is 1d, 1h, etc.

            @member ejs.DateHistogramFacet
            @param {String} offset The offset as a string (1d, 1h, etc)
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      postOffset: function (offset) {
        if (offset == null) {
          return facet[name].date_histogram.post_offset;
        }
      
        facet[name].date_histogram.post_offset = offset;
        return this;
      },
      
      /**
            <p>The date histogram works on numeric values (since time is stored 
            in milliseconds since the epoch in UTC).<p> 

            <p>But, sometimes, systems will store a different resolution (like seconds since UTC) 
            in a numeric field. The factor parameter can be used to change the value in the field 
            to milliseconds to actual do the relevant rounding, and then be applied again to get to 
            the original unit.</p>

            <p>For example, when storing in a numeric field seconds resolution, 
            the factor can be set to 1000.<p>

            @member ejs.DateHistogramFacet
            @param {Integer} f The conversion factor.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      factor: function (f) {
        if (f == null) {
          return facet[name].date_histogram.factor;
        }
      
        facet[name].date_histogram.factor = f;
        return this;
      },
      
      /**
            Allows you modify the <code>value</code> field using a script. The modified value
            is then used to compute the statistical data.

            @member ejs.DateHistogramFacet
            @param {String} scriptCode A valid script string to execute.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      valueScript: function (scriptCode) {
        if (scriptCode == null) {
          return facet[name].date_histogram.value_script;
        }
      
        facet[name].date_histogram.value_script = scriptCode;
        return this;
      },

      /**
            <p>Sets the type of ordering that will be performed on the date
            buckets.  Valid values are:<p>
            
            <dl>
                <dd><code>time</code> - the default, sort by the buckets start time in milliseconds.</dd>
                <dd><code>count</code> - sort by the number of items in the bucket</dd>
                <dd><code>total</code> - sort by the sum/total of the items in the bucket</dd>
            <dl>
            
            @member ejs.DateHistogramFacet
            @param {String} o The ordering method: time, count, or total.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      order: function (o) {
        if (o == null) {
          return facet[name].date_histogram.order;
        }
      
        o = o.toLowerCase();
        if (o === 'time' || o === 'count' || o === 'total') {
          facet[name].date_histogram.order = o;
        }
        
        return this;
      },
      
      /**
            The script language being used. Currently supported values are
            <code>javascript</code>, <code>groovy</code>, and <code>mvel</code>.

            @member ejs.DateHistogramFacet
            @param {String} language The language of the script.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      lang: function (language) {
        if (language == null) {
          return facet[name].date_histogram.lang;
        }
      
        facet[name].date_histogram.lang = language;
        return this;
      },

      /**
            Sets parameters that will be applied to the script.  Overwrites 
            any existing params.

            @member ejs.DateHistogramFacet
            @param {Object} p An object where the keys are the parameter name and 
              values are the parameter value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      params: function (p) {
        if (p == null) {
          return facet[name].date_histogram.params;
        }
    
        facet[name].date_histogram.params = p;
        return this;
      }
      
    });
  };

  /**
    @class
    <p>The FilterFacet allows you to specify any valid <code>Filter</code> and
    have the number of matching hits returned as the value.</p>

    <p>Facets are similar to SQL <code>GROUP BY</code> statements but perform much
       better. You can also construct several <em>"groups"</em> at once by simply
       specifying multiple facets.</p>

    <div class="alert-message block-message info">
        <p>
            <strong>Tip: </strong>
            For more information on faceted navigation, see
            <a href="http://en.wikipedia.org/wiki/Faceted_classification">this</a>
            Wikipedia article on Faceted Classification.
        </p>
    </div>

    @name ejs.FilterFacet
    @ejs facet
    @borrows ejs.FacetMixin.facetFilter as facetFilter
    @borrows ejs.FacetMixin.global as global
    @borrows ejs.FacetMixin.mode as mode
    @borrows ejs.FacetMixin.cacheFilter as cacheFilter
    @borrows ejs.FacetMixin.scope as scope
    @borrows ejs.FacetMixin.nested as nested
    @borrows ejs.FacetMixin._type as _type
    @borrows ejs.FacetMixin.toJSON as toJSON

    @desc
    <p>A facet that return a count of the hits matching the given filter.</p>

    @param {String} name The name which be used to refer to this facet. For instance,
        the facet itself might utilize a field named <code>doc_authors</code>. Setting
        <code>name</code> to <code>Authors</code> would allow you to refer to the
        facet by that name, possibly simplifying some of the display logic.

    */
  ejs.FilterFacet = function (name) {

    var
      _common = ejs.FacetMixin(name),
      facet = _common.toJSON();

    return extend(_common, {

      /**
            <p>Sets the filter to be used for this facet.</p>

            @member ejs.FilterFacet
            @param {Object} oFilter A valid <code>Query</code> object.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      filter: function (oFilter) {
        if (oFilter == null) {
          return facet[name].filter;
        }
      
        if (!isFilter(oFilter)) {
          throw new TypeError('Argument must be a Filter');
        }
        
        facet[name].filter = oFilter.toJSON();
        return this;
      }
      
    });
  };

  /**
    @class
    <p>The geoDistanceFacet facet provides information over a range of distances from a
    provided point. This includes the number of hits that fall within each range,
    along with aggregate information (like total).</p>

    <p>Facets are similar to SQL <code>GROUP BY</code> statements but perform much
       better. You can also construct several <em>"groups"</em> at once by simply
       specifying multiple facets.</p>

    <div class="alert-message block-message info">
        <p>
            <strong>Tip: </strong>
            For more information on faceted navigation, see
            <a href="http://en.wikipedia.org/wiki/Faceted_classification">this</a>
            Wikipedia article on Faceted Classification.
        </p>
    </div>

    @name ejs.GeoDistanceFacet
    @ejs facet
    @borrows ejs.FacetMixin.facetFilter as facetFilter
    @borrows ejs.FacetMixin.global as global
    @borrows ejs.FacetMixin.mode as mode
    @borrows ejs.FacetMixin.cacheFilter as cacheFilter
    @borrows ejs.FacetMixin.scope as scope
    @borrows ejs.FacetMixin.nested as nested
    @borrows ejs.FacetMixin._type as _type
    @borrows ejs.FacetMixin.toJSON as toJSON

    @desc
    <p>A facet which provides information over a range of distances from a provided point.</p>

    @param {String} name The name which be used to refer to this facet. For instance,
        the facet itself might utilize a field named <code>doc_authors</code>. Setting
        <code>name</code> to <code>Authors</code> would allow you to refer to the
        facet by that name, possibly simplifying some of the display logic.

    */
  ejs.GeoDistanceFacet = function (name) {

    var
      _common = ejs.FacetMixin(name),
      facet = _common.toJSON(),
      point = ejs.GeoPoint([0, 0]),
      field = 'location';

    facet[name].geo_distance = {
      location: point.toJSON(),
      ranges: []
    };

    return extend(_common, {

      /**
            Sets the document field containing the geo-coordinate to be used 
            to calculate the distance.  Defaults to "location".

            @member ejs.GeoDistanceFacet
            @param {String} fieldName The field name whose data will be used to construct the facet.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      field: function (fieldName) {
        var oldValue = facet[name].geo_distance[field];
        
        if (fieldName == null) {
          return field;
        }

        delete facet[name].geo_distance[field];
        field = fieldName;
        facet[name].geo_distance[fieldName] = oldValue;
        
        return this;
      },

      /**
            Sets the point of origin from where distances will be measured.

            @member ejs.GeoDistanceFacet
            @param {GeoPoint} p A valid GeoPoint object
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      point: function (p) {
        if (p == null) {
          return point;
        }
      
        if (!isGeoPoint(p)) {
          throw new TypeError('Argument must be a GeoPoint');
        }
        
        point = p;
        facet[name].geo_distance[field] = p.toJSON();
        return this;
      },

      /**
            Adds a new bounded range.

            @member ejs.GeoDistanceFacet
            @param {Number} from The lower bound of the range
            @param {Number} to The upper bound of the range
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      addRange: function (from, to) {
        if (arguments.length === 0) {
          return facet[name].geo_distance.ranges;
        }
      
        facet[name].geo_distance.ranges.push({
          from: from,
          to: to
        });
        
        return this;
      },

      /**
            Adds a new unbounded lower limit.

            @member ejs.GeoDistanceFacet
            @param {Number} from The lower limit of the unbounded range
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      addUnboundedFrom: function (from) {
        if (from == null) {
          return facet[name].geo_distance.ranges;
        }
      
        facet[name].geo_distance.ranges.push({
          from: from
        });
        
        return this;
      },

      /**
            Adds a new unbounded upper limit.

            @member ejs.GeoDistanceFacet
            @param {Number} to The upper limit of the unbounded range
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      addUnboundedTo: function (to) {
        if (to == null) {
          return facet[name].geo_distance.ranges;
        }
      
        facet[name].geo_distance.ranges.push({
          to: to
        });
        
        return this;
      },

      /**
             Sets the distance unit.  Valid values are "mi" for miles or "km"
             for kilometers. Defaults to "km".

             @member ejs.GeoDistanceFacet
             @param {Number} unit the unit of distance measure.
             @returns {Object} returns <code>this</code> so that calls can be chained.
             */
      unit: function (unit) {
        if (unit == null) {
          return facet[name].geo_distance.unit;
        }
      
        unit = unit.toLowerCase();
        if (unit === 'mi' || unit === 'km') {
          facet[name].geo_distance.unit = unit;
        }
        
        return this;
      },
      
      /**
            How to compute the distance. Can either be arc (better precision) 
            or plane (faster). Defaults to arc.

            @member ejs.GeoDistanceFacet
            @param {String} type The execution type as a string.  
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      distanceType: function (type) {
        if (type == null) {
          return facet[name].geo_distance.distance_type;
        }

        type = type.toLowerCase();
        if (type === 'arc' || type === 'plane') {
          facet[name].geo_distance.distance_type = type;
        }
        
        return this;
      },

      /**
            If the lat/long points should be normalized to lie within their
            respective normalized ranges.
            
            Normalized ranges are:
            lon = -180 (exclusive) to 180 (inclusive) range
            lat = -90 to 90 (both inclusive) range

            @member ejs.GeoDistanceFacet
            @param {String} trueFalse True if the coordinates should be normalized. False otherwise.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      normalize: function (trueFalse) {
        if (trueFalse == null) {
          return facet[name].geo_distance.normalize;
        }

        facet[name].geo_distance.normalize = trueFalse;
        return this;
      },
      
      /**
            Allows you to specify a different value field to aggrerate over.

            @member ejs.GeoDistanceFacet
            @param {String} fieldName The name of the field to be used.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      valueField: function (fieldName) {
        if (fieldName == null) {
          return facet[name].geo_distance.value_field;
        }
      
        facet[name].geo_distance.value_field = fieldName;
        return this;
      },
      
      /**
            Allows you modify the <code>value</code> field using a script. The modified value
            is then used to compute the statistical data.

            @member ejs.GeoDistanceFacet
            @param {String} scriptCode A valid script string to execute.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      valueScript: function (scriptCode) {
        if (scriptCode == null) {
          return facet[name].geo_distance.value_script;
        }
      
        facet[name].geo_distance.value_script = scriptCode;
        return this;
      },
      
      /**
            The script language being used. Currently supported values are
            <code>javascript</code>, <code>groovy</code>, and <code>mvel</code>.

            @member ejs.GeoDistanceFacet
            @param {String} language The language of the script.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      lang: function (language) {
        if (language == null) {
          return facet[name].geo_distance.lang;
        }
      
        facet[name].geo_distance.lang = language;
        return this;
      },
      
      /**
            Sets parameters that will be applied to the script.  Overwrites 
            any existing params.

            @member ejs.GeoDistanceFacet
            @param {Object} p An object where the keys are the parameter name and 
              values are the parameter value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      params: function (p) {
        if (p == null) {
          return facet[name].geo_distance.params;
        }
    
        facet[name].geo_distance.params = p;
        return this;
      }
      
    });
  };

  /**
    @class
    <p>The histogram facet works with numeric data by building a histogram across intervals
       of the field values. Each value is <em>rounded</em> into an interval (or placed in a
       bucket), and statistics are provided per interval/bucket (count and total).</p>

    <p>Facets are similar to SQL <code>GROUP BY</code> statements but perform much
       better. You can also construct several <em>"groups"</em> at once by simply
       specifying multiple facets.</p>

    <div class="alert-message block-message info">
        <p>
            <strong>Tip: </strong>
            For more information on faceted navigation, see
            <a href="http://en.wikipedia.org/wiki/Faceted_classification">this</a>
            Wikipedia article on Faceted Classification.
        </p>
    </div>

    @name ejs.HistogramFacet
    @ejs facet
    @borrows ejs.FacetMixin.facetFilter as facetFilter
    @borrows ejs.FacetMixin.global as global
    @borrows ejs.FacetMixin.mode as mode
    @borrows ejs.FacetMixin.cacheFilter as cacheFilter
    @borrows ejs.FacetMixin.scope as scope
    @borrows ejs.FacetMixin.nested as nested
    @borrows ejs.FacetMixin._type as _type
    @borrows ejs.FacetMixin.toJSON as toJSON

    @desc
    <p>A facet which returns the N most frequent terms within a collection
       or set of collections.</p>

    @param {String} name The name which be used to refer to this facet. For instance,
        the facet itself might utilize a field named <code>doc_authors</code>. Setting
        <code>name</code> to <code>Authors</code> would allow you to refer to the
        facet by that name, possibly simplifying some of the display logic.

    */
  ejs.HistogramFacet = function (name) {

    var 
      _common = ejs.FacetMixin(name),
      facet = _common.toJSON();

    facet[name].histogram = {};

    return extend(_common, {

      /**
            Sets the field to be used to construct the this facet.

            @member ejs.HistogramFacet
            @param {String} fieldName The field name whose data will be used to construct the facet.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      field: function (fieldName) {
        if (fieldName == null) {
          return facet[name].histogram.field;
        }
      
        facet[name].histogram.field = fieldName;
        return this;
      },

      /**
            Sets the bucket interval used to calculate the distribution.

            @member ejs.HistogramFacet
            @param {Number} numericInterval The bucket interval in which to group values.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      interval: function (numericInterval) {
        if (numericInterval == null) {
          return facet[name].histogram.interval;
        }
      
        facet[name].histogram.interval = numericInterval;
        return this;
      },

      /**
            Sets the bucket interval used to calculate the distribution based
            on a time value such as "1d", "1w", etc.

            @member ejs.HistogramFacet
            @param {Number} timeInterval The bucket interval in which to group values.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      timeInterval: function (timeInterval) {
        if (timeInterval == null) {
          return facet[name].histogram.time_interval;
        }
      
        facet[name].histogram.time_interval = timeInterval;
        return this;
      },

      /**
            Sets the "from", "start", or lower bounds bucket.  For example if 
            you have a value of 1023, an interval of 100, and a from value of 
            1500, it will be placed into the 1500 bucket vs. the normal bucket 
            of 1000.

            @member ejs.HistogramFacet
            @param {Number} from the lower bounds bucket value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      from: function (from) {
        if (from == null) {
          return facet[name].histogram.from;
        }
      
        facet[name].histogram.from = from;
        return this;
      },

      /**
            Sets the "to", "end", or upper bounds bucket.  For example if 
            you have a value of 1023, an interval of 100, and a to value of 
            900, it will be placed into the 900 bucket vs. the normal bucket 
            of 1000.

            @member ejs.HistogramFacet
            @param {Number} to the upper bounds bucket value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      to: function (to) {
        if (to == null) {
          return facet[name].histogram.to;
        }
      
        facet[name].histogram.to = to;
        return this;
      },
                  
      /**
            Allows you to specify a different value field to aggrerate over.

            @member ejs.HistogramFacet
            @param {String} fieldName The name of the field to be used.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      valueField: function (fieldName) {
        if (fieldName == null) {
          return facet[name].histogram.value_field;
        }
      
        facet[name].histogram.value_field = fieldName;
        return this;
      },

      /**
            Allows you to specify a different key field to be used to group intervals.

            @member ejs.HistogramFacet
            @param {String} fieldName The name of the field to be used.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      keyField: function (fieldName) {
        if (fieldName == null) {
          return facet[name].histogram.key_field;
        }
      
        facet[name].histogram.key_field = fieldName;
        return this;
      },

      /**
            Allows you modify the <code>value</code> field using a script. The modified value
            is then used to compute the statistical data.

            @member ejs.HistogramFacet
            @param {String} scriptCode A valid script string to execute.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      valueScript: function (scriptCode) {
        if (scriptCode == null) {
          return facet[name].histogram.value_script;
        }
      
        facet[name].histogram.value_script = scriptCode;
        return this;
      },

      /**
            Allows you modify the <code>key</code> field using a script. The modified value
            is then used to generate the interval.

            @member ejs.HistogramFacet
            @param {String} scriptCode A valid script string to execute.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      keyScript: function (scriptCode) {
        if (scriptCode == null) {
          return facet[name].histogram.key_script;
        }
      
        facet[name].histogram.key_script = scriptCode;
        return this;
      },

      /**
            The script language being used. Currently supported values are
            <code>javascript</code>, <code>groovy</code>, and <code>mvel</code>.

            @member ejs.HistogramFacet
            @param {String} language The language of the script.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      lang: function (language) {
        if (language == null) {
          return facet[name].histogram.lang;
        }
      
        facet[name].histogram.lang = language;
        return this;
      },

      /**
            Sets parameters that will be applied to the script.  Overwrites 
            any existing params.

            @member ejs.HistogramFacet
            @param {Object} p An object where the keys are the parameter name and 
              values are the parameter value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      params: function (p) {
        if (p == null) {
          return facet[name].histogram.params;
        }
    
        facet[name].histogram.params = p;
        return this;
      },
      
      /**
            Sets the type of ordering that will be performed on the date
            buckets.  Valid values are:
            
            key - the default, sort by the bucket's key value
            count - sort by the number of items in the bucket
            total - sort by the sum/total of the items in the bucket
            
            @member ejs.HistogramFacet
            @param {String} o The ordering method: key, count, or total.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      order: function (o) {
        if (o == null) {
          return facet[name].histogram.order;
        }
      
        o = o.toLowerCase();
        if (o === 'key' || o === 'count' || o === 'total') {
          facet[name].histogram.order = o;
        }
        
        return this;
      }
      
    });
  };

  /**
    @class
    <p>The QueryFacet facet allows you to specify any valid <code>Query</code> and
    have the number of matching hits returned as the value.</p>

    <p>Facets are similar to SQL <code>GROUP BY</code> statements but perform much
       better. You can also construct several <em>"groups"</em> at once by simply
       specifying multiple facets.</p>

    <div class="alert-message block-message info">
        <p>
            <strong>Tip: </strong>
            For more information on faceted navigation, see
            <a href="http://en.wikipedia.org/wiki/Faceted_classification">this</a>
            Wikipedia article on Faceted Classification.
        </p>
    </div>

    @name ejs.QueryFacet
    @ejs facet
    @borrows ejs.FacetMixin.facetFilter as facetFilter
    @borrows ejs.FacetMixin.global as global
    @borrows ejs.FacetMixin.mode as mode
    @borrows ejs.FacetMixin.cacheFilter as cacheFilter
    @borrows ejs.FacetMixin.scope as scope
    @borrows ejs.FacetMixin.nested as nested
    @borrows ejs.FacetMixin._type as _type
    @borrows ejs.FacetMixin.toJSON as toJSON

    @desc
    <p>A facet that return a count of the hits matching the given query.</p>

    @param {String} name The name which be used to refer to this facet. For instance,
        the facet itself might utilize a field named <code>doc_authors</code>. Setting
        <code>name</code> to <code>Authors</code> would allow you to refer to the
        facet by that name, possibly simplifying some of the display logic.

    */
  ejs.QueryFacet = function (name) {

    var 
      _common = ejs.FacetMixin(name),
      facet = _common.toJSON();

    return extend(_common, {

      /**
            <p>Sets the query to be used for this facet.</p>

            @member ejs.QueryFacet
            @param {Object} oQuery A valid <code>Query</code> object.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      query: function (oQuery) {
        if (oQuery == null) {
          return facet[name].query;
        }
      
        if (!isQuery(oQuery)) {
          throw new TypeError('Argument must be a Query');
        }
        
        facet[name].query = oQuery.toJSON();
        return this;
      }
      
    });
  };

  /**
    @class
    <p>A RangeFacet allows you to specify a set of ranges and get both the number of docs (count) that
       fall within each range, and aggregated data based on the field, or another specified field.</p>

    <p>Facets are similar to SQL <code>GROUP BY</code> statements but perform much
       better. You can also construct several <em>"groups"</em> at once by simply
       specifying multiple facets.</p>

    <div class="alert-message block-message info">
        <p>
            <strong>Tip: </strong>
            For more information on faceted navigation, see
            <a href="http://en.wikipedia.org/wiki/Faceted_classification">this</a>
            Wikipedia article on Faceted Classification.
        </p>
    </div>

    @name ejs.RangeFacet
    @ejs facet
    @borrows ejs.FacetMixin.facetFilter as facetFilter
    @borrows ejs.FacetMixin.global as global
    @borrows ejs.FacetMixin.mode as mode
    @borrows ejs.FacetMixin.cacheFilter as cacheFilter
    @borrows ejs.FacetMixin.scope as scope
    @borrows ejs.FacetMixin.nested as nested
    @borrows ejs.FacetMixin._type as _type
    @borrows ejs.FacetMixin.toJSON as toJSON

    @desc
    <p>A facet which provides information over a range of numeric intervals.</p>

    @param {String} name The name which be used to refer to this facet. For instance,
        the facet itself might utilize a field named <code>doc_authors</code>. Setting
        <code>name</code> to <code>Authors</code> would allow you to refer to the
        facet by that name, possibly simplifying some of the display logic.

    */
  ejs.RangeFacet = function (name) {

    var 
      _common = ejs.FacetMixin(name),
      facet = _common.toJSON();

    facet[name].range = {
      ranges: []
    };

    return extend(_common, {

      /**
            Sets the document field to be used for the facet.

            @member ejs.RangeFacet
            @param {String} fieldName The field name whose data will be used to compute the interval.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      field: function (fieldName) {
        if (fieldName == null) {
          return facet[name].range.field;
        }
      
        facet[name].range.field = fieldName;
        return this;
      },

      /**
            Allows you to specify an alternate key field to be used to compute the interval.

            @member ejs.RangeFacet
            @param {String} fieldName The field name whose data will be used to compute the interval.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      keyField: function (fieldName) {
        if (fieldName == null) {
          return facet[name].range.key_field;
        }
      
        facet[name].range.key_field = fieldName;
        return this;
      },

      /**
            Allows you to specify an alternate value field to be used to compute statistical information.

            @member ejs.RangeFacet
            @param {String} fieldName The field name whose data will be used to compute statistics.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      valueField: function (fieldName) {
        if (fieldName == null) {
          return facet[name].range.value_field;
        }
      
        facet[name].range.value_field = fieldName;
        return this;
      },

      /**
            Allows you modify the <code>value</code> field using a script. The modified value
            is then used to compute the statistical data.

            @member ejs.RangeFacet
            @param {String} scriptCode A valid script string to execute.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      valueScript: function (scriptCode) {
        if (scriptCode == null) {
          return facet[name].range.value_script;
        }
      
        facet[name].range.value_script = scriptCode;
        return this;
      },

      /**
            Allows you modify the <code>key</code> field using a script. The modified value
            is then used to generate the interval.

            @member ejs.RangeFacet
            @param {String} scriptCode A valid script string to execute.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      keyScript: function (scriptCode) {
        if (scriptCode == null) {
          return facet[name].range.key_script;
        }
      
        facet[name].range.key_script = scriptCode;
        return this;
      },

      /**
            The script language being used. Currently supported values are
            <code>javascript</code>, <code>groovy</code>, and <code>mvel</code>.

            @member ejs.RangeFacet
            @param {String} language The language of the script.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      lang: function (language) {
        if (language == null) {
          return facet[name].range.lang;
        }
      
        facet[name].range.lang = language;
        return this;
      },

      /**
            Sets parameters that will be applied to the script.  Overwrites 
            any existing params.

            @member ejs.RangeFacet
            @param {Object} p An object where the keys are the parameter name and 
              values are the parameter value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      params: function (p) {
        if (p == null) {
          return facet[name].range.params;
        }
    
        facet[name].range.params = p;
        return this;
      },
      
      /**
            Adds a new bounded range.

            @member ejs.RangeFacet
            @param {Number} from The lower bound of the range (can also be <code>Date</code>).
            @param {Number} to The upper bound of the range (can also be <code>Date</code>).
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      addRange: function (from, to) {
        if (arguments.length === 0) {
          return facet[name].range.ranges;
        }
      
        facet[name].range.ranges.push({
          from: from,
          to: to
        });
        
        return this;
      },

      /**
            Adds a new unbounded lower limit.

            @member ejs.RangeFacet
            @param {Number} from The lower limit of the unbounded range (can also be <code>Date</code>).
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      addUnboundedFrom: function (from) {
        if (from == null) {
          return facet[name].range.ranges;
        }
      
        facet[name].range.ranges.push({
          from: from
        });
        
        return this;
      },

      /**
            Adds a new unbounded upper limit.

            @member ejs.RangeFacet
            @param {Number} to The upper limit of the unbounded range (can also be <code>Date</code>).
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      addUnboundedTo: function (to) {
        if (to == null) {
          return facet[name].range.ranges;
        }
      
        facet[name].range.ranges.push({
          to: to
        });
        
        return this;
      }
      
    });
  };

  /**
    @class
    <p>A statistical facet allows you to compute statistical data over a numeric fields. Statistical data includes
    the count, total, sum of squares, mean (average), minimum, maximum, variance, and standard deviation.</p>

    <p>Facets are similar to SQL <code>GROUP BY</code> statements but perform much
       better. You can also construct several <em>"groups"</em> at once by simply
       specifying multiple facets.</p>

    <div class="alert-message block-message info">
        <p>
            <strong>Tip: </strong>
            For more information on faceted navigation, see
            <a href="http://en.wikipedia.org/wiki/Faceted_classification">this</a>
            Wikipedia article on Faceted Classification.
        </p>
    </div>

    @name ejs.StatisticalFacet
    @ejs facet
    @borrows ejs.FacetMixin.facetFilter as facetFilter
    @borrows ejs.FacetMixin.global as global
    @borrows ejs.FacetMixin.mode as mode
    @borrows ejs.FacetMixin.cacheFilter as cacheFilter
    @borrows ejs.FacetMixin.scope as scope
    @borrows ejs.FacetMixin.nested as nested
    @borrows ejs.FacetMixin._type as _type
    @borrows ejs.FacetMixin.toJSON as toJSON

    @desc
    <p>A facet which returns statistical information about a numeric field</p>

    @param {String} name The name which be used to refer to this facet. For instance,
        the facet itself might utilize a field named <code>doc_authors</code>. Setting
        <code>name</code> to <code>Authors</code> would allow you to refer to the
        facet by that name, possibly simplifying some of the display logic.

    */
  ejs.StatisticalFacet = function (name) {

    var 
      _common = ejs.FacetMixin(name),
      facet = _common.toJSON();

    facet[name].statistical = {};

    return extend(_common, {

      /**
            Sets the field to be used to construct the this facet.

            @member ejs.StatisticalFacet
            @param {String} fieldName The field name whose data will be used to construct the facet.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      field: function (fieldName) {
        if (fieldName == null) {
          return facet[name].statistical.field;
        }
      
        facet[name].statistical.field = fieldName;
        return this;
      },

      /**
            Aggregate statistical info across a set of fields.

            @member ejs.StatisticalFacet
            @param {Array} aFieldName An array of field names.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      fields: function (fields) {
        if (fields == null) {
          return facet[name].statistical.fields;
        }
      
        if (!isArray(fields)) {
          throw new TypeError('Argument must be an array');
        }
        
        facet[name].statistical.fields = fields;
        return this;
      },

      /**
            Define a script to evaluate of which the result will be used to generate
            the statistical information.

            @member ejs.StatisticalFacet
            @param {String} code The script code to execute.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      script: function (code) {
        if (code == null) {
          return facet[name].statistical.script;
        }
      
        facet[name].statistical.script = code;
        return this;
      },

      /**
            The script language being used. Currently supported values are
            <code>javascript</code>, <code>groovy</code>, and <code>mvel</code>.

            @member ejs.StatisticalFacet
            @param {String} language The language of the script.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      lang: function (language) {
        if (language == null) {
          return facet[name].statistical.lang;
        }
      
        facet[name].statistical.lang = language;
        return this;
      },

      /**
            Allows you to set script parameters to be used during the execution of the script.

            @member ejs.StatisticalFacet
            @param {Object} oParams An object containing key/value pairs representing param name/value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      params: function (oParams) {
        if (oParams == null) {
          return facet[name].statistical.params;
        }
      
        facet[name].statistical.params = oParams;
        return this;
      }
      
    });
  };

  /**
    @class
    <p>A termsStatsFacet allows you to compute statistics over an aggregate key (term). Essentially this
    facet provides the functionality of what is often refered to as a <em>pivot table</em>.</p>

    <p>Facets are similar to SQL <code>GROUP BY</code> statements but perform much
       better. You can also construct several <em>"groups"</em> at once by simply
       specifying multiple facets.</p>

    <div class="alert-message block-message info">
        <p>
            <strong>Tip: </strong>
            For more information on faceted navigation, see
            <a href="http://en.wikipedia.org/wiki/Faceted_classification">this</a>
            Wikipedia article on Faceted Classification.
        </p>
    </div>

    @name ejs.TermStatsFacet
    @ejs facet
    @borrows ejs.FacetMixin.facetFilter as facetFilter
    @borrows ejs.FacetMixin.global as global
    @borrows ejs.FacetMixin.mode as mode
    @borrows ejs.FacetMixin.cacheFilter as cacheFilter
    @borrows ejs.FacetMixin.scope as scope
    @borrows ejs.FacetMixin.nested as nested
    @borrows ejs.FacetMixin._type as _type
    @borrows ejs.FacetMixin.toJSON as toJSON

    @desc
    <p>A facet which computes statistical data based on an aggregate key.</p>

    @param {String} name The name which be used to refer to this facet. For instance,
        the facet itself might utilize a field named <code>doc_authors</code>. Setting
        <code>name</code> to <code>Authors</code> would allow you to refer to the
        facet by that name, possibly simplifying some of the display logic.

    */
  ejs.TermStatsFacet = function (name) {

    var 
      _common = ejs.FacetMixin(name),
      facet = _common.toJSON();

    facet[name].terms_stats = {};

    return extend(_common, {

      /**
            Sets the field for which statistical information will be generated.

            @member ejs.TermStatsFacet
            @param {String} fieldName The field name whose data will be used to construct the facet.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      valueField: function (fieldName) {
        if (fieldName == null) {
          return facet[name].terms_stats.value_field;
        }
      
        facet[name].terms_stats.value_field = fieldName;
        return this;
      },

      /**
            Sets the field which will be used to pivot on (group-by).

            @member ejs.TermStatsFacet
            @param {String} fieldName The field name whose data will be used to construct the facet.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      keyField: function (fieldName) {
        if (fieldName == null) {
          return facet[name].terms_stats.key_field;
        }
      
        facet[name].terms_stats.key_field = fieldName;
        return this;
      },

      /**
            Sets a script that will provide the terms for a given document.

            @member ejs.TermStatsFacet
            @param {String} script The script code.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      scriptField: function (script) {
        if (script == null) {
          return facet[name].terms_stats.script_field;
        }
      
        facet[name].terms_stats.script_field = script;
        return this;
      },
      
      /**
            Define a script to evaluate of which the result will be used to generate
            the statistical information.

            @member ejs.TermStatsFacet
            @param {String} code The script code to execute.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      valueScript: function (code) {
        if (code == null) {
          return facet[name].terms_stats.value_script;
        }
      
        facet[name].terms_stats.value_script = code;
        return this;
      },

      /**
            <p>Allows you to return all terms, even if the frequency count is 0. This should not be
               used on fields that contain a large number of unique terms because it could cause
               <em>out-of-memory</em> errors.</p>

            @member ejs.TermStatsFacet
            @param {String} trueFalse <code>true</code> or <code>false</code>
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      allTerms: function (trueFalse) {
        if (trueFalse == null) {
          return facet[name].terms_stats.all_terms;
        }
      
        facet[name].terms_stats.all_terms = trueFalse;
        return this;
      },
      
      /**
            The script language being used. Currently supported values are
            <code>javascript</code>, <code>groovy</code>, and <code>mvel</code>.

            @member ejs.TermStatsFacet
            @param {String} language The language of the script.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      lang: function (language) {
        if (language == null) {
          return facet[name].terms_stats.lang;
        }
      
        facet[name].terms_stats.lang = language;
        return this;
      },

      /**
            Allows you to set script parameters to be used during the execution of the script.

            @member ejs.TermStatsFacet
            @param {Object} oParams An object containing key/value pairs representing param name/value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      params: function (oParams) {
        if (oParams == null) {
          return facet[name].terms_stats.params;
        }
      
        facet[name].terms_stats.params = oParams;
        return this;
      },

      /**
            Sets the number of facet entries that will be returned for this facet. For instance, you
            might ask for only the top 5 aggregate keys although there might be hundreds of
            unique keys. <strong>Higher settings could cause memory strain</strong>.

            @member ejs.TermStatsFacet
            @param {Integer} facetSize The numer of facet entries to be returned.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      size: function (facetSize) {
        if (facetSize == null) {
          return facet[name].terms_stats.size;
        }
      
        facet[name].terms_stats.size = facetSize;
        return this;
      },

      /**
            Sets the type of ordering that will be performed on the date
            buckets.  Valid values are:
            
            count - default, sort by the number of items in the bucket
            term - sort by term value.
            reverse_count - reverse sort of the number of items in the bucket
            reverse_term - reverse sort of the term value.
            total - sorts by the total value of the bucket contents
            reverse_total - reverse sort of the total value of bucket contents
            min - the minimum value in the bucket
            reverse_min - the reverse sort of the minimum value
            max - the maximum value in the bucket
            reverse_max - the reverse sort of the maximum value
            mean - the mean value of the bucket contents
            reverse_mean - the reverse sort of the mean value of bucket contents.
            
            @member ejs.TermStatsFacet
            @param {String} o The ordering method
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      order: function (o) {
        if (o == null) {
          return facet[name].terms_stats.order;
        }
      
        o = o.toLowerCase();
        if (o === 'count' || o === 'term' || o === 'reverse_count' || 
          o === 'reverse_term' || o === 'total' || o === 'reverse_total' || 
          o === 'min' || o === 'reverse_min' || o === 'max' || 
          o === 'reverse_max' || o === 'mean' || o === 'reverse_mean') {
          
          facet[name].terms_stats.order = o;
        }
        
        return this;
      }
      
    });
  };

  /**
    @class
    <p>A facet which returns the N most frequent terms within a collection
       or set of collections. Term facets are useful for building constructs
       which allow users to refine search results by filtering on terms returned
       by the facet.</p>

    <p>Facets are similar to SQL <code>GROUP BY</code> statements but perform much
       better. You can also construct several <em>"groups"</em> at once by simply
       specifying multiple facets.</p>

    <p>For more information on faceted navigation, see this Wikipedia article on
       <a href="http://en.wikipedia.org/wiki/Faceted_classification">Faceted Classification</a></p<

    @name ejs.TermsFacet
    @ejs facet
    @borrows ejs.FacetMixin.facetFilter as facetFilter
    @borrows ejs.FacetMixin.global as global
    @borrows ejs.FacetMixin.mode as mode
    @borrows ejs.FacetMixin.cacheFilter as cacheFilter
    @borrows ejs.FacetMixin.scope as scope
    @borrows ejs.FacetMixin.nested as nested
    @borrows ejs.FacetMixin._type as _type
    @borrows ejs.FacetMixin.toJSON as toJSON

    @desc
    <p>A facet which returns the N most frequent terms within a collection
       or set of collections.</p>

    @param {String} name The name which be used to refer to this facet. For instance,
        the facet itself might utilize a field named <code>doc_authors</code>. Setting
        <code>name</code> to <code>Authors</code> would allow you to refer to the
        facet by that name, possibly simplifying some of the display logic.

    */
  ejs.TermsFacet = function (name) {

    var
      _common = ejs.FacetMixin(name),
      facet = _common.toJSON();

    facet[name].terms = {};

    return extend(_common, {

      /**
            Sets the field to be used to construct the this facet.  Set to
            _index to return a facet count of hits per _index the search was
            executed on.

            @member ejs.TermsFacet
            @param {String} fieldName The field name whose data will be used to construct the facet.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      field: function (fieldName) {
        if (fieldName == null) {
          return facet[name].terms.field;
        }

        facet[name].terms.field = fieldName;
        return this;
      },

      /**
            Aggregate statistical info across a set of fields.

            @member ejs.TermsFacet
            @param {Array} aFieldName An array of field names.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      fields: function (fields) {
        if (fields == null) {
          return facet[name].terms.fields;
        }

        if (!isArray(fields)) {
          throw new TypeError('Argument must be an array');
        }

        facet[name].terms.fields = fields;
        return this;
      },

      /**
            Sets a script that will provide the terms for a given document.

            @member ejs.TermsFacet
            @param {String} script The script code.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      scriptField: function (script) {
        if (script == null) {
          return facet[name].terms.script_field;
        }

        facet[name].terms.script_field = script;
        return this;
      },

      /**
            Sets the number of facet entries that will be returned for this facet. For instance, you
            might ask for only the top 5 <code>authors</code> although there might be hundreds of
            unique authors.

            @member ejs.TermsFacet
            @param {Integer} facetSize The numer of facet entries to be returned.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      size: function (facetSize) {
        if (facetSize == null) {
          return facet[name].terms.size;
        }

        facet[name].terms.size = facetSize;
        return this;
      },


      /**
            Determines how many terms the coordinating node will request from
            each shard.

            @member ejs.TermsFacet
            @param {Integer} shardSize The numer of terms to fetch from each shard.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      shardSize: function (shardSize) {
        if (shardSize == null) {
          return facet[name].terms.shard_size;
        }

        facet[name].terms.shard_size = shardSize;
        return this;
      },

      /**
            Sets the type of ordering that will be performed on the date
            buckets.  Valid values are:

            count - default, sort by the number of items in the bucket
            term - sort by term value.
            reverse_count - reverse sort of the number of items in the bucket
            reverse_term - reverse sort of the term value.

            @member ejs.TermsFacet
            @param {String} o The ordering method
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      order: function (o) {
        if (o == null) {
          return facet[name].terms.order;
        }

        o = o.toLowerCase();
        if (o === 'count' || o === 'term' ||
          o === 'reverse_count' || o === 'reverse_term') {

          facet[name].terms.order = o;
        }

        return this;
      },

      /**
            <p>Allows you to return all terms, even if the frequency count is 0. This should not be
               used on fields that contain a large number of unique terms because it could cause
               <em>out-of-memory</em> errors.</p>

            @member ejs.TermsFacet
            @param {String} trueFalse <code>true</code> or <code>false</code>
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      allTerms: function (trueFalse) {
        if (trueFalse == null) {
          return facet[name].terms.all_terms;
        }

        facet[name].terms.all_terms = trueFalse;
        return this;
      },

      /**
            <p>Allows you to filter out unwanted facet entries. When passed
            a single term, it is appended to the list of currently excluded
            terms.  If passed an array, it overwrites all existing values.</p>

            @member ejs.TermsFacet
            @param {(String|String[])} exclude A single term to exclude or an
              array of terms to exclude.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      exclude: function (exclude) {
        if (facet[name].terms.exclude == null) {
          facet[name].terms.exclude = [];
        }

        if (exclude == null) {
          return facet[name].terms.exclude;
        }

        if (isString(exclude)) {
          facet[name].terms.exclude.push(exclude);
        } else if (isArray(exclude)) {
          facet[name].terms.exclude = exclude;
        } else {
          throw new TypeError('Argument must be string or array');
        }

        return this;
      },

      /**
            <p>Allows you to only include facet entries matching a specified regular expression.</p>

            @member ejs.TermsFacet
            @param {String} exp A valid regular expression.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      regex: function (exp) {
        if (exp == null) {
          return facet[name].terms.regex;
        }

        facet[name].terms.regex = exp;
        return this;
      },

      /**
            <p>Allows you to set the regular expression flags to be used
            with the <code>regex</code></p>

            @member ejs.TermsFacet
            @param {String} flags A valid regex flag - see <a href="http://docs.oracle.com/javase/6/docs/api/java/util/regex/Pattern.html#field_summary">Java Pattern API</a>
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      regexFlags: function (flags) {
        if (flags == null) {
          return facet[name].terms.regex_flags;
        }

        facet[name].terms.regex_flags = flags;
        return this;
      },

      /**
            Allows you modify the term using a script. The modified value
            is then used in the facet collection.

            @member ejs.TermsFacet
            @param {String} scriptCode A valid script string to execute.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      script: function (scriptCode) {
        if (scriptCode == null) {
          return facet[name].terms.script;
        }

        facet[name].terms.script = scriptCode;
        return this;
      },

      /**
            The script language being used. Currently supported values are
            <code>javascript</code>, <code>groovy</code>, and <code>mvel</code>.

            @member ejs.TermsFacet
            @param {String} language The language of the script.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      lang: function (language) {
        if (language == null) {
          return facet[name].terms.lang;
        }

        facet[name].terms.lang = language;
        return this;
      },

      /**
            Sets parameters that will be applied to the script.  Overwrites
            any existing params.

            @member ejs.TermsFacet
            @param {Object} p An object where the keys are the parameter name and
              values are the parameter value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      params: function (p) {
        if (p == null) {
          return facet[name].terms.params;
        }

        facet[name].terms.params = p;
        return this;
      },

      /**
            Sets the execution hint determines how the facet is computed.
            Currently only supported value is "map".

            @member ejs.TermsFacet
            @param {Object} h The hint value as a string.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      executionHint: function (h) {
        if (h == null) {
          return facet[name].terms.execution_hint;
        }

        facet[name].terms.execution_hint = h;
        return this;
      }

    });
  };

  /**
    @class
    <p>A single-value metrics aggregation that computes the average of numeric
    values that are extracted from the aggregated documents. These values can be
    extracted either from specific numeric fields in the documents, or be
    generated by a provided script.</p>

    @name ejs.AvgAggregation
    @ejs aggregation
    @borrows ejs.MetricsAggregationMixin.field as field
    @borrows ejs.MetricsAggregationMixin.script as script
    @borrows ejs.MetricsAggregationMixin.lang as lang
    @borrows ejs.MetricsAggregationMixin.scriptValuesSorted as scriptValuesSorted
    @borrows ejs.MetricsAggregationMixin.params as params
    @borrows ejs.AggregationMixin._type as _type
    @borrows ejs.AggregationMixin.toJSON as toJSON

    @desc
    <p>Aggregation that computes the average of numeric values that are extracted
    from the aggregated documents.</p>

    @param {String} name The name which be used to refer to this aggregation.

    */
  ejs.AvgAggregation = function (name) {

    var
      _common = ejs.MetricsAggregationMixin(name, 'avg'),
      agg = _common.toJSON();

    return _common;
  };

  /**
    @class
    <p>A single-value metrics aggregation that calculates an approximate count of
    distinct values. Values can be extracted either from specific fields in the
    document or generated by a script.</p>

    @name ejs.CardinalityAggregation
    @ejs aggregation
    @borrows ejs.MetricsAggregationMixin.field as field
    @borrows ejs.MetricsAggregationMixin.script as script
    @borrows ejs.MetricsAggregationMixin.lang as lang
    @borrows ejs.MetricsAggregationMixin.params as params
    @borrows ejs.AggregationMixin._type as _type
    @borrows ejs.AggregationMixin.toJSON as toJSON

    @desc
    <p>Aggregation that calculates an approximate count of distinct values.</p>

    @param {String} name The name which be used to refer to this aggregation.

    */
  ejs.CardinalityAggregation = function (name) {

    var
      _common = ejs.MetricsAggregationMixin(name, 'cardinality'),
      agg = _common.toJSON();

    // not supported in cardinality aggregation
    delete _common.scriptValuesSorted;

    return extend(_common, {

      /**
      Set to false to disable rehashing of values.  You must have computed a hash
      on the client-side and stored it into your documents if you disable this.

      @member ejs.CardinalityAggregation
      @param {Boolean} trueFalse set to false to disable rehashing
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      rehash: function (trueFalse) {
        if (trueFalse == null) {
          return agg[name].cardinality.rehash;
        }

        agg[name].cardinality.rehash = trueFalse;
        return this;
      },

      /**
      Allows to trade memory for accuracy, and defines a unique count below which
      counts are expected to be close to accurate. Above this value, counts might
      become a bit more fuzzy. The maximum supported value is 40000, thresholds
      above this number will have the same effect as a threshold of 40000.
      Default value depends on the number of parent aggregations that multiple
      create buckets (such as terms or histograms).

      @member ejs.CardinalityAggregation
      @param {Long} num The threshold value
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      precisionThreshold: function (num) {
        if (num == null) {
          return agg[name].cardinality.precision_threshold;
        }

        agg[name].cardinality.precision_threshold = num;
        return this;
      }

    });

  };

  /**
    @class
    <p>A multi-bucket aggregation similar to the histogram except it can only be
    applied on date values. Since dates are represented in elasticsearch
    internally as long values, it is possible to use the normal histogram on
    dates as well, though accuracy will be compromised. The reason for this is
    in the fact that time based intervals are not fixed (think of leap years and
    on the number of days in a month). For this reason, we need a special
    support for time based data. From a functionality perspective, this
    histogram supports the same features as the normal histogram. The main
    difference is that the interval can be specified by date/time expressions.</p>

    @name ejs.DateHistogramAggregation
    @ejs aggregation
    @borrows ejs.AggregationMixin.aggregation as aggregation
    @borrows ejs.AggregationMixin.agg as agg
    @borrows ejs.AggregationMixin._type as _type
    @borrows ejs.AggregationMixin.toJSON as toJSON

    @desc
    <p>Aggregation similar to the histogram except it can only be applied on
    date values.</p>

    @param {String} name The name which be used to refer to this aggregation.

    */
  ejs.DateHistogramAggregation = function (name) {

    var
      _common = ejs.AggregationMixin(name),
      agg = _common.toJSON();

    agg[name].date_histogram = {};

    return extend(_common, {

      /**
      <p>Sets the field to gather terms from.</p>

      @member ejs.DateHistogramAggregation
      @param {String} field a valid field name..
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      field: function (field) {
        if (field == null) {
          return agg[name].date_histogram.field;
        }

        agg[name].date_histogram.field = field;
        return this;
      },

      /**
      Allows you generate or modify the terms using a script.

      @member ejs.DateHistogramAggregation
      @param {String} scriptCode A valid script string to execute.
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      script: function (scriptCode) {
        if (scriptCode == null) {
          return agg[name].date_histogram.script;
        }

        agg[name].date_histogram.script = scriptCode;
        return this;
      },

      /**
      The script language being used.

      @member ejs.DateHistogramAggregation
      @param {String} language The language of the script.
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      lang: function (language) {
        if (language == null) {
          return agg[name].date_histogram.lang;
        }

        agg[name].date_histogram.lang = language;
        return this;
      },

      /**
      Set the date time zone.

      @member ejs.DateHistogramAggregation
      @param {String} tz the time zone.
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      timeZone: function (tz) {
        if (tz == null) {
          return agg[name].date_histogram.time_zone;
        }

        agg[name].date_histogram.time_zone = tz;
        return this;
      },

      /**
      Set the pre-rouding date time zone.

      @member ejs.DateHistogramAggregation
      @param {String} tz the time zone.
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      preZone: function (tz) {
        if (tz == null) {
          return agg[name].date_histogram.pre_zone;
        }

        agg[name].date_histogram.pre_zone = tz;
        return this;
      },

      /**
      Set the post-rouding date time zone.

      @member ejs.DateHistogramAggregation
      @param {String} tz the time zone.
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      postZone: function (tz) {
        if (tz == null) {
          return agg[name].date_histogram.post_zone;
        }

        agg[name].date_histogram.post_zone = tz;
        return this;
      },

      /**
      Set the pre-rouding offset.

      @member ejs.DateHistogramAggregation
      @param {String} offset the offset.
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      preOffset: function (offset) {
        if (offset == null) {
          return agg[name].date_histogram.pre_offset;
        }

        agg[name].date_histogram.pre_offset = offset;
        return this;
      },

      /**
      Set the post-rouding offset.

      @member ejs.DateHistogramAggregation
      @param {String} offset the offset.
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      postOffset: function (offset) {
        if (offset == null) {
          return agg[name].date_histogram.post_offset;
        }

        agg[name].date_histogram.post_offset = offset;
        return this;
      },

      /**
      Set's the range/bounds for the histogram aggregation.  Useful when you
      want to include buckets that might be outside the bounds of indexed
      documents.

      @member ejs.DateHistogramAggregation
      @param {(String|Long)} min The start bound / minimum bound value
      @param {(String|Long)} max The end bound / maximum bound value
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      extendedBounds: function (min, max) {
        var bounds;
        if (min == null && max == null) {
          return agg[name].date_histogram.extended_bounds;
        }

        bounds = {};
        if (min != null) {
          bounds.min = min;
        }

        if (max != null) {
          bounds.max = max;
        }

        agg[name].date_histogram.extended_bounds = bounds;
        return this;
      },

      /**
      Sets the histogram interval.  Buckets are generated based on this interval
      value.

      @member ejs.DateHistogramAggregation
      @param {String} i The interval
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      interval: function (i) {
        if (i == null) {
          return agg[name].date_histogram.interval;
        }

        agg[name].date_histogram.interval = i;
        return this;
      },

      /**
      Sets the format expression for the terms.  Use for number or date
      formatting

      @member ejs.DateHistogramAggregation
      @param {String} f the format string
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      format: function (f) {
        if (f == null) {
          return agg[name].date_histogram.format;
        }

        agg[name].date_histogram.format = f;
        return this;
      },

      /**
      Enable the response to be returned as a keyed object where the key is the
      bucket interval.

      @member ejs.DateHistogramAggregation
      @param {Boolean} trueFalse to enable keyed response or not
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      keyed: function (trueFalse) {
        if (trueFalse == null) {
          return agg[name].date_histogram.keyed;
        }

        agg[name].date_histogram.keyed = trueFalse;
        return this;
      },

      /**
      Set to true to assume script values are sorted.

      @member ejs.DateHistogramAggregation
      @param {Boolean} trueFalse assume sorted values or not
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      scriptValuesSorted: function (trueFalse) {
        if (trueFalse == null) {
          return agg[name].date_histogram.script_values_sorted;
        }

        agg[name].date_histogram.script_values_sorted = trueFalse;
        return this;
      },

      /**
      Set to true to apply interval adjusts to day and above intervals.

      @member ejs.DateHistogramAggregation
      @param {Boolean} trueFalse adjust large intervals or not
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      preZoneAdjustLargeInterval: function (trueFalse) {
        if (trueFalse == null) {
          return agg[name].date_histogram.pre_zone_adjust_large_interval;
        }

        agg[name].date_histogram.pre_zone_adjust_large_interval = trueFalse;
        return this;
      },

      /**
      Only return terms that match more than a configured number of hits.

      @member ejs.DateHistogramAggregation
      @param {Integer} num The numer of minimum number of hits.
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      minDocCount: function (num) {
        if (num == null) {
          return agg[name].date_histogram.min_doc_count;
        }

        agg[name].date_histogram.min_doc_count = num;
        return this;
      },

      /**
      Sets parameters that will be applied to the script.  Overwrites
      any existing params.

      @member ejs.DateHistogramAggregation
      @param {Object} p An object where the keys are the parameter name and
        values are the parameter value.
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      params: function (p) {
        if (p == null) {
          return agg[name].date_histogram.params;
        }

        agg[name].date_histogram.params = p;
        return this;
      },

      /**
      Sets order for the aggregated values.

      @member ejs.DateHistogramAggregation
      @param {String} order The order string.
      @param {String} direction The sort direction, asc or desc.
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      order: function (order, direction) {
        if (order == null) {
          return agg[name].date_histogram.order;
        }

        if (direction == null) {
          direction = 'desc';
        }

        direction = direction.toLowerCase();
        if (direction !== 'asc' && direction !== 'desc') {
          direction = 'desc';
        }

        agg[name].date_histogram.order = {};
        agg[name].date_histogram.order[order] = direction;
        return this;
      }

    });
  };

  /**
    @class
    <p>A range aggregation that is dedicated for date values. The main difference
    between this aggregation and the normal range aggregation is that the from
    and to values can be expressed in Date Math expressions, and it is also
    possible to specify a date format by which the from and to response fields
    will be returned. Note that this aggregration includes the from value and
    excludes the to value for each range.</p>

    <p>Note that this aggregration includes the from value and excludes the to
    value for each range.</p>

    @name ejs.DateRangeAggregation
    @ejs aggregation
    @borrows ejs.AggregationMixin.aggregation as aggregation
    @borrows ejs.AggregationMixin.agg as agg
    @borrows ejs.AggregationMixin._type as _type
    @borrows ejs.AggregationMixin.toJSON as toJSON

    @desc
    <p>Aggregation that is dedicated for date value ranges.</p>

    @param {String} name The name which be used to refer to this aggregation.

    */
  ejs.DateRangeAggregation = function (name) {

    var
      _common = ejs.AggregationMixin(name),
      agg = _common.toJSON();

    agg[name].date_range = {};

    return extend(_common, {

      /**
      <p>Sets the field to gather terms from.</p>

      @member ejs.DateRangeAggregation
      @param {String} field a valid field name..
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      field: function (field) {
        if (field == null) {
          return agg[name].date_range.field;
        }

        agg[name].date_range.field = field;
        return this;
      },

      /**
      Allows you generate or modify the terms using a script.

      @member ejs.DateRangeAggregation
      @param {String} scriptCode A valid script string to execute.
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      script: function (scriptCode) {
        if (scriptCode == null) {
          return agg[name].date_range.script;
        }

        agg[name].date_range.script = scriptCode;
        return this;
      },

      /**
      The script language being used.

      @member ejs.DateRangeAggregation
      @param {String} language The language of the script.
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      lang: function (language) {
        if (language == null) {
          return agg[name].date_range.lang;
        }

        agg[name].date_range.lang = language;
        return this;
      },

      /**
      Sets the date format expression.

      @member ejs.DateRangeAggregation
      @param {String} f the format string
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      format: function (f) {
        if (f == null) {
          return agg[name].date_range.format;
        }

        agg[name].date_range.format = f;
        return this;
      },

      /**
      Adds a range to the list of exsiting range expressions.

      @member ejs.DateRangeAggregation
      @param {String} from The start value, use null to ignore
      @param {String} to The end value, use null to ignore.
      @param {String} key Optional key/bucket name for keyed responses.
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      range: function (from, to, key) {
        var rangeObj = {};
        if (agg[name].date_range.ranges == null) {
          agg[name].date_range.ranges = [];
        }

        if (from == null && to == null) {
          return agg[name].date_range.ranges;
        }

        if (from != null) {
          rangeObj.from = from;
        }

        if (to != null) {
          rangeObj.to = to;
        }

        if (key != null) {
          rangeObj.key = key;
        }

        agg[name].date_range.ranges.push(rangeObj);
        return this;
      },

      /**
      Enable the response to be returned as a keyed object where the key is the
      bucket interval.

      @member ejs.DateRangeAggregation
      @param {Boolean} trueFalse to enable keyed response or not
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      keyed: function (trueFalse) {
        if (trueFalse == null) {
          return agg[name].date_range.keyed;
        }

        agg[name].date_range.keyed = trueFalse;
        return this;
      },

      /**
      Set to true to assume script values are sorted.

      @member ejs.DateRangeAggregation
      @param {Boolean} trueFalse assume sorted values or not
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      scriptValuesSorted: function (trueFalse) {
        if (trueFalse == null) {
          return agg[name].date_range.script_values_sorted;
        }

        agg[name].date_range.script_values_sorted = trueFalse;
        return this;
      },

      /**
      Sets parameters that will be applied to the script.  Overwrites
      any existing params.

      @member ejs.DateRangeAggregation
      @param {Object} p An object where the keys are the parameter name and
        values are the parameter value.
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      params: function (p) {
        if (p == null) {
          return agg[name].date_range.params;
        }

        agg[name].date_range.params = p;
        return this;
      }

    });
  };

  /**
    @class
    <p>A multi-value metrics aggregation that computes stats over numeric values
    extracted from the aggregated documents. These values can be extracted either
    from specific numeric fields in the documents, or be generated by a provided
    script.</p>

    <p>The extended_stats aggregations is an extended version of the
    <code>StatsAggregation</code>, where additional metrics are added such as
    sum_of_squares, variance and std_deviation.</p>

    @name ejs.ExtendedStatsAggregation
    @ejs aggregation
    @borrows ejs.MetricsAggregationMixin.field as field
    @borrows ejs.MetricsAggregationMixin.script as script
    @borrows ejs.MetricsAggregationMixin.lang as lang
    @borrows ejs.MetricsAggregationMixin.scriptValuesSorted as scriptValuesSorted
    @borrows ejs.MetricsAggregationMixin.params as params
    @borrows ejs.AggregationMixin._type as _type
    @borrows ejs.AggregationMixin.toJSON as toJSON

    @desc
    <p>Aggregation that computes extra stats over numeric values extracted from
    the aggregated documents.</p>

    @param {String} name The name which be used to refer to this aggregation.

    */
  ejs.ExtendedStatsAggregation = function (name) {

    var
      _common = ejs.MetricsAggregationMixin(name, 'extended_stats'),
      agg = _common.toJSON();

    return _common;
  };

  /**
    @class
    <p>Defines a single bucket of all the documents in the current document set
    context that match a specified filter. Often this will be used to narrow down
    the current aggregation context to a specific set of documents.</p>

    @name ejs.FilterAggregation
    @ejs aggregation
    @borrows ejs.AggregationMixin.aggregation as aggregation
    @borrows ejs.AggregationMixin.agg as agg
    @borrows ejs.AggregationMixin._type as _type
    @borrows ejs.AggregationMixin.toJSON as toJSON

    @desc
    <p>Defines a single bucket of all the documents that match a given filter.</p>

    @param {String} name The name which be used to refer to this aggregation.

    */
  ejs.FilterAggregation = function (name) {

    var
      _common = ejs.AggregationMixin(name),
      agg = _common.toJSON();

    return extend(_common, {

      /**
      <p>Sets the filter to be used for this aggregation.</p>

      @member ejs.FilterAggregation
      @param {Filter} oFilter A valid <code>Filter</code> object.
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      filter: function (oFilter) {
        if (oFilter == null) {
          return agg[name].filter;
        }

        if (!isFilter(oFilter)) {
          throw new TypeError('Argument must be a Filter');
        }

        agg[name].filter = oFilter.toJSON();
        return this;
      }

    });
  };

  /**
    @class
    <p>A multi-bucket aggregation that works on geo_point fields and conceptually
    works very similar to the range aggregation. The user can define a point of
    origin and a set of distance range buckets. The aggregation evaluate the
    distance of each document value from the origin point and determines the
    buckets it belongs to based on the ranges (a document belongs to a bucket
    if the distance between the document and the origin falls within the distance
    range of the bucket).</p>

    @name ejs.GeoDistanceAggregation
    @ejs aggregation
    @borrows ejs.AggregationMixin.aggregation as aggregation
    @borrows ejs.AggregationMixin.agg as agg
    @borrows ejs.AggregationMixin._type as _type
    @borrows ejs.AggregationMixin.toJSON as toJSON

    @desc
    <p>Aggregation that works on geo_point fields and conceptually works very
    similar to the range aggregation.</p>

    @param {String} name The name which be used to refer to this aggregation.

    */
  ejs.GeoDistanceAggregation = function (name) {

    var
      _common = ejs.AggregationMixin(name),
      point = ejs.GeoPoint([0, 0]),
      agg = _common.toJSON();

    agg[name].geo_distance = {};

    return extend(_common, {

      /**
      <p>Sets the field to gather terms from.</p>

      @member ejs.GeoDistanceAggregation
      @param {String} field a valid field name..
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      field: function (field) {
        if (field == null) {
          return agg[name].geo_distance.field;
        }

        agg[name].geo_distance.field = field;
        return this;
      },

      /**
      Sets the distance unit.  Valid values are:
      in, yd, ft, km, NM, mm, cm, mi, and m.

      @member ejs.GeoDistanceAggregation
      @param {Number} unit the unit of distance measure.
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      unit: function (unit) {
        if (unit == null) {
          return agg[name].geo_distance.unit;
        }

        if (unit === 'in' || unit === 'yd' || unit === 'ft' || unit === 'km' ||
            unit === 'NM' || unit === 'mm' || unit === 'cm' || unit === 'mi' ||
            unit === 'm')  {
          agg[name].geo_distance.unit = unit;
        }

        return this;
      },

      /**
      How to compute the distance. Valid values are:
      plane, arc, sloppy_arc, and factor.

      @member ejs.GeoDistanceAggregation
      @param {String} type The execution type as a string.
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      distanceType: function (type) {
        if (type == null) {
          return agg[name].geo_distance.distance_type;
        }

        type = type.toLowerCase();
        if (type === 'plane' || type === 'arc' || type === 'sloppy_arc' ||
            type === 'factor') {
          agg[name].geo_distance.distance_type = type;
        }

        return this;
      },

      /**
      Sets the point of origin from where distances will be measured.

      @member ejs.GeoDistanceAggregation
      @param {GeoPoint} p A valid GeoPoint object
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      origin: function (p) {
        if (p == null) {
          return point;
        }

        if (!isGeoPoint(p)) {
          throw new TypeError('Argument must be a GeoPoint');
        }

        point = p;
        agg[name].geo_distance.origin = p.toJSON();
        return this;
      },

      /**
      Sets the point of origin from where distances will be measured. Same as
      origin.

      @member ejs.GeoDistanceAggregation
      @param {GeoPoint} p A valid GeoPoint object
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      point: function (p) {
        if (p == null) {
          return point;
        }

        if (!isGeoPoint(p)) {
          throw new TypeError('Argument must be a GeoPoint');
        }

        point = p;
        agg[name].geo_distance.point = p.toJSON();
        return this;
      },

      /**
      Sets the point of origin from where distances will be measured. Same as
      origin.

      @member ejs.GeoDistanceAggregation
      @param {GeoPoint} p A valid GeoPoint object
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      center: function (p) {
        if (p == null) {
          return point;
        }

        if (!isGeoPoint(p)) {
          throw new TypeError('Argument must be a GeoPoint');
        }

        point = p;
        agg[name].geo_distance.center = p.toJSON();
        return this;
      },

      /**
      Adds a range to the list of exsiting range expressions.

      @member ejs.GeoDistanceAggregation
      @param {String} from The start value, use null to ignore
      @param {String} to The end value, use null to ignore.
      @param {String} key Optional key/bucket name for keyed responses.
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      range: function (from, to, key) {
        var rangeObj = {};
        if (agg[name].geo_distance.ranges == null) {
          agg[name].geo_distance.ranges = [];
        }

        if (from == null && to == null) {
          return agg[name].geo_distance.ranges;
        }

        if (from != null) {
          rangeObj.from = from;
        }

        if (to != null) {
          rangeObj.to = to;
        }

        if (key != null) {
          rangeObj.key = key;
        }

        agg[name].geo_distance.ranges.push(rangeObj);
        return this;
      },

      /**
      Enable the response to be returned as a keyed object where the key is the
      bucket interval.

      @member ejs.GeoDistanceAggregation
      @param {Boolean} trueFalse to enable keyed response or not
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      keyed: function (trueFalse) {
        if (trueFalse == null) {
          return agg[name].geo_distance.keyed;
        }

        agg[name].geo_distance.keyed = trueFalse;
        return this;
      }

    });
  };

  /**
    @class
    <p>A multi-bucket aggregation that works on geo_point fields and groups points
    into buckets that represent cells in a grid. The resulting grid can be sparse
    and only contains cells that have matching data. Each cell is labeled using a
    geohash which is of user-definable precision.</p>

    @name ejs.GeoHashGridAggregation
    @ejs aggregation
    @borrows ejs.AggregationMixin.aggregation as aggregation
    @borrows ejs.AggregationMixin.agg as agg
    @borrows ejs.AggregationMixin._type as _type
    @borrows ejs.AggregationMixin.toJSON as toJSON

    @desc
    <p>Aggregation that works on geo_point fields and groups points into buckets
    that represent cells in a grid.</p>

    @param {String} name The name which be used to refer to this aggregation.

    */
  ejs.GeoHashGridAggregation = function (name) {

    var
      _common = ejs.AggregationMixin(name),
      agg = _common.toJSON();

    agg[name].geohash_grid = {};

    return extend(_common, {

      /**
      Sets the geo field to perform calculations from.

      @member ejs.GeoHashGridAggregation
      @param {String} field a valid field name.
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      field: function (field) {
        if (field == null) {
          return agg[name].geohash_grid.field;
        }

        agg[name].geohash_grid.field = field;
        return this;
      },

      /**
      Sets the Geo Hash precision.  The precision value can be between 1 and 12
      where 12 is the highest precision.

      @member ejs.GeoHashGridAggregation
      @param {Integer} p The precision.  Integer between 1 and 12.
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      precision: function (p) {
        if (p == null) {
          return agg[name].geohash_grid.precision;
        }

        agg[name].geohash_grid.precision = p;
        return this;
      },

      /**
      Sets the number of aggregation entries that will be returned.

      @member ejs.GeoHashGridAggregation
      @param {Integer} size The numer of aggregation entries to be returned.
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      size: function (size) {
        if (size == null) {
          return agg[name].geohash_grid.size;
        }

        agg[name].geohash_grid.size = size;
        return this;
      },


      /**
      Determines how many geohash_grid the coordinating node will request from
      each shard.

      @member ejs.GeoHashGridAggregation
      @param {Integer} shardSize The numer of geohash_grid to fetch from each shard.
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      shardSize: function (shardSize) {
        if (shardSize == null) {
          return agg[name].geohash_grid.shard_size;
        }

        agg[name].geohash_grid.shard_size = shardSize;
        return this;
      }

    });
  };

  /**
    @class
    <p>Defines a single bucket of all the documents within the search execution
    context. This context is defined by the indices and the document types you’re
    searching on, but is not influenced by the search query itself.</p>

    @name ejs.GlobalAggregation
    @ejs aggregation
    @borrows ejs.AggregationMixin.aggregation as aggregation
    @borrows ejs.AggregationMixin.agg as agg
    @borrows ejs.AggregationMixin._type as _type
    @borrows ejs.AggregationMixin.toJSON as toJSON

    @desc
    <p>Defines a single bucket of all the documents within the search context.</p>

    @param {String} name The name which be used to refer to this aggregation.

    */
  ejs.GlobalAggregation = function (name) {

    var
      _common = ejs.AggregationMixin(name),
      agg = _common.toJSON();

    agg[name].global = {};

    return _common;
  };

  /**
    @class
    <p>A multi-bucket values source based aggregation that can be applied on
    numeric values extracted from the documents. It dynamically builds fixed
    size (a.k.a. interval) buckets over the values.</p>

    @name ejs.HistogramAggregation
    @ejs aggregation
    @borrows ejs.AggregationMixin.aggregation as aggregation
    @borrows ejs.AggregationMixin.agg as agg
    @borrows ejs.AggregationMixin._type as _type
    @borrows ejs.AggregationMixin.toJSON as toJSON

    @desc
    <p>Aggregation that can be applied on numeric values extracted from the
    documents.</p>

    @param {String} name The name which be used to refer to this aggregation.

    */
  ejs.HistogramAggregation = function (name) {

    var
      _common = ejs.AggregationMixin(name),
      agg = _common.toJSON();

    agg[name].histogram = {};

    return extend(_common, {

      /**
      <p>Sets the field to gather terms from.</p>

      @member ejs.HistogramAggregation
      @param {String} field a valid field name..
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      field: function (field) {
        if (field == null) {
          return agg[name].histogram.field;
        }

        agg[name].histogram.field = field;
        return this;
      },

      /**
      Allows you generate or modify the terms using a script.

      @member ejs.HistogramAggregation
      @param {String} scriptCode A valid script string to execute.
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      script: function (scriptCode) {
        if (scriptCode == null) {
          return agg[name].histogram.script;
        }

        agg[name].histogram.script = scriptCode;
        return this;
      },

      /**
      The script language being used.

      @member ejs.HistogramAggregation
      @param {String} language The language of the script.
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      lang: function (language) {
        if (language == null) {
          return agg[name].histogram.lang;
        }

        agg[name].histogram.lang = language;
        return this;
      },

      /**
      Sets the format expression for the terms.  Use for number or date
      formatting

      @member ejs.HistogramAggregation
      @param {String} f the format string
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      format: function (f) {
        if (f == null) {
          return agg[name].histogram.format;
        }

        agg[name].histogram.format = f;
        return this;
      },

      /**
      Set's the range/bounds for the histogram aggregation.  Useful when you
      want to include buckets that might be outside the bounds of indexed
      documents.

      @member ejs.HistogramAggregation
      @param {Long} min The start bound / minimum bound value
      @param {Long} max The end bound / maximum bound value
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      extendedBounds: function (min, max) {
        var bounds;
        if (min == null && max == null) {
          return agg[name].histogram.extended_bounds;
        }

        bounds = {};
        if (min != null) {
          bounds.min = min;
        }

        if (max != null) {
          bounds.max = max;
        }

        agg[name].histogram.extended_bounds = bounds;
        return this;
      },

      /**
      Sets the histogram interval.  Buckets are generated based on this interval
      value.

      @member ejs.HistogramAggregation
      @param {Integer} i The interval
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      interval: function (i) {
        if (i == null) {
          return agg[name].histogram.interval;
        }

        agg[name].histogram.interval = i;
        return this;
      },

      /**
      Only return terms that match more than a configured number of hits.

      @member ejs.HistogramAggregation
      @param {Integer} num The numer of minimum number of hits.
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      minDocCount: function (num) {
        if (num == null) {
          return agg[name].histogram.min_doc_count;
        }

        agg[name].histogram.min_doc_count = num;
        return this;
      },

      /**
      Enable the response to be returned as a keyed object where the key is the
      bucket interval.

      @member ejs.HistogramAggregation
      @param {Boolean} trueFalse to enable keyed response or not
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      keyed: function (trueFalse) {
        if (trueFalse == null) {
          return agg[name].histogram.keyed;
        }

        agg[name].histogram.keyed = trueFalse;
        return this;
      },

      /**
      Set to true to assume script values are sorted.

      @member ejs.HistogramAggregation
      @param {Boolean} trueFalse assume sorted values or not
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      scriptValuesSorted: function (trueFalse) {
        if (trueFalse == null) {
          return agg[name].histogram.script_values_sorted;
        }

        agg[name].histogram.script_values_sorted = trueFalse;
        return this;
      },

      /**
      Sets parameters that will be applied to the script.  Overwrites
      any existing params.

      @member ejs.HistogramAggregation
      @param {Object} p An object where the keys are the parameter name and
        values are the parameter value.
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      params: function (p) {
        if (p == null) {
          return agg[name].histogram.params;
        }

        agg[name].histogram.params = p;
        return this;
      },

      /**
      Sets order for the aggregated values.

      @member ejs.HistogramAggregation
      @param {String} order The order string.
      @param {String} direction The sort direction, asc or desc.
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      order: function (order, direction) {
        if (order == null) {
          return agg[name].histogram.order;
        }

        if (direction == null) {
          direction = 'desc';
        }

        direction = direction.toLowerCase();
        if (direction !== 'asc' && direction !== 'desc') {
          direction = 'desc';
        }

        agg[name].histogram.order = {};
        agg[name].histogram.order[order] = direction;
        return this;
      }

    });
  };

  /**
    @class
    <p>A dedicated range aggregation for IPv4 typed fields.</p>

    <p>Note that this aggregration includes the from value and excludes the to
    value for each range.</p>

    @name ejs.IPv4RangeAggregation
    @ejs aggregation
    @borrows ejs.AggregationMixin.aggregation as aggregation
    @borrows ejs.AggregationMixin.agg as agg
    @borrows ejs.AggregationMixin._type as _type
    @borrows ejs.AggregationMixin.toJSON as toJSON

    @desc
    <p>A dedicated range aggregation for IPv4 typed fields.</p>

    @param {String} name The name which be used to refer to this aggregation.

    */
  ejs.IPv4RangeAggregation = function (name) {

    var
      _common = ejs.AggregationMixin(name),
      agg = _common.toJSON();

    agg[name].ip_range = {};

    return extend(_common, {

      /**
      <p>Sets the field to gather terms from.</p>

      @member ejs.IPv4RangeAggregation
      @param {String} field a valid field name..
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      field: function (field) {
        if (field == null) {
          return agg[name].ip_range.field;
        }

        agg[name].ip_range.field = field;
        return this;
      },

      /**
      Allows you generate or modify the terms using a script.

      @member ejs.IPv4RangeAggregation
      @param {String} scriptCode A valid script string to execute.
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      script: function (scriptCode) {
        if (scriptCode == null) {
          return agg[name].ip_range.script;
        }

        agg[name].ip_range.script = scriptCode;
        return this;
      },

      /**
      The script language being used.

      @member ejs.IPv4RangeAggregation
      @param {String} language The language of the script.
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      lang: function (language) {
        if (language == null) {
          return agg[name].ip_range.lang;
        }

        agg[name].ip_range.lang = language;
        return this;
      },

      /**
      Adds a range to the list of exsiting range expressions.

      @member ejs.IPv4RangeAggregation
      @param {String} from The start value, use null to ignore
      @param {String} to The end value, use null to ignore.
      @param {String} key Optional key/bucket name for keyed responses.
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      range: function (from, to, mask, key) {
        var rangeObj = {};
        if (agg[name].ip_range.ranges == null) {
          agg[name].ip_range.ranges = [];
        }

        if (from == null && to == null && mask == null) {
          return agg[name].ip_range.ranges;
        }

        if (from != null) {
          rangeObj.from = from;
        }

        if (to != null) {
          rangeObj.to = to;
        }

        if (mask != null) {
          rangeObj.mask = mask;
        }

        if (key != null) {
          rangeObj.key = key;
        }

        agg[name].ip_range.ranges.push(rangeObj);
        return this;
      },

      /**
      Enable the response to be returned as a keyed object where the key is the
      bucket interval.

      @member ejs.IPv4RangeAggregation
      @param {Boolean} trueFalse to enable keyed response or not
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      keyed: function (trueFalse) {
        if (trueFalse == null) {
          return agg[name].ip_range.keyed;
        }

        agg[name].ip_range.keyed = trueFalse;
        return this;
      },

      /**
      Set to true to assume script values are sorted.

      @member ejs.IPv4RangeAggregation
      @param {Boolean} trueFalse assume sorted values or not
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      scriptValuesSorted: function (trueFalse) {
        if (trueFalse == null) {
          return agg[name].ip_range.script_values_sorted;
        }

        agg[name].ip_range.script_values_sorted = trueFalse;
        return this;
      },

      /**
      Sets parameters that will be applied to the script.  Overwrites
      any existing params.

      @member ejs.IPv4RangeAggregation
      @param {Object} p An object where the keys are the parameter name and
        values are the parameter value.
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      params: function (p) {
        if (p == null) {
          return agg[name].ip_range.params;
        }

        agg[name].ip_range.params = p;
        return this;
      }

    });
  };

  /**
    @class
    <p>A single-value metrics aggregation that keeps track and returns the
    maximum value among the numeric values extracted from the aggregated
    documents. These values can be extracted either from specific numeric fields
    in the documents, or be generated by a provided script.</p>

    @name ejs.MaxAggregation
    @ejs aggregation
    @borrows ejs.MetricsAggregationMixin.field as field
    @borrows ejs.MetricsAggregationMixin.script as script
    @borrows ejs.MetricsAggregationMixin.lang as lang
    @borrows ejs.MetricsAggregationMixin.scriptValuesSorted as scriptValuesSorted
    @borrows ejs.MetricsAggregationMixin.params as params
    @borrows ejs.AggregationMixin._type as _type
    @borrows ejs.AggregationMixin.toJSON as toJSON

    @desc
    <p>Aggregation that keeps track and returns the maximum value among the
    numeric values extracted from the aggregated documents.</p>

    @param {String} name The name which be used to refer to this aggregation.

    */
  ejs.MaxAggregation = function (name) {

    var
      _common = ejs.MetricsAggregationMixin(name, 'max'),
      agg = _common.toJSON();

    return _common;
  };

  /**
    @class
    <p>A single-value metrics aggregation that keeps track and returns the
    minimum value among numeric values extracted from the aggregated documents.
    These values can be extracted either from specific numeric fields in the
    documents, or be generated by a provided script.</p>

    @name ejs.MinAggregation
    @ejs aggregation
    @borrows ejs.MetricsAggregationMixin.field as field
    @borrows ejs.MetricsAggregationMixin.script as script
    @borrows ejs.MetricsAggregationMixin.lang as lang
    @borrows ejs.MetricsAggregationMixin.scriptValuesSorted as scriptValuesSorted
    @borrows ejs.MetricsAggregationMixin.params as params
    @borrows ejs.AggregationMixin._type as _type
    @borrows ejs.AggregationMixin.toJSON as toJSON

    @desc
    <p>Aggregation that keeps track and returns the minimum value among numeric
    values extracted from the aggregated documents.</p>

    @param {String} name The name which be used to refer to this aggregation.

    */
  ejs.MinAggregation = function (name) {

    var
      _common = ejs.MetricsAggregationMixin(name, 'min'),
      agg = _common.toJSON();

    return _common;
  };

  /**
    @class
    <p>A field data based single bucket aggregation, that creates a bucket of all
    documents in the current document set context that are missing a field value
    (effectively, missing a field or having the configured NULL value set).</p>

    @name ejs.MissingAggregation
    @ejs aggregation
    @borrows ejs.AggregationMixin.aggregation as aggregation
    @borrows ejs.AggregationMixin.agg as agg
    @borrows ejs.AggregationMixin._type as _type
    @borrows ejs.AggregationMixin.toJSON as toJSON

    @desc
    <p>Defines a bucket of all documents that are missing a field value.</p>

    @param {String} name The name which be used to refer to this aggregation.

    */
  ejs.MissingAggregation = function (name) {

    var
      _common = ejs.AggregationMixin(name),
      agg = _common.toJSON();

    agg[name].missing = {};

    return extend(_common, {

      /**
      <p>Sets the field to gather missing terms from.</p>

      @member ejs.MissingAggregation
      @param {String} field a valid field name..
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      field: function (field) {
        if (field == null) {
          return agg[name].missing.field;
        }

        agg[name].missing.field = field;
        return this;
      }

    });
  };

  /**
    @class
    <p>A special single bucket aggregation that enables aggregating nested
    documents.</p>

    @name ejs.NestedAggregation
    @ejs aggregation
    @borrows ejs.AggregationMixin.aggregation as aggregation
    @borrows ejs.AggregationMixin.agg as agg
    @borrows ejs.AggregationMixin._type as _type
    @borrows ejs.AggregationMixin.toJSON as toJSON

    @desc
    <p>A special single bucket aggregation that enables aggregating nested
    documents.</p>

    @param {String} name The name which be used to refer to this aggregation.

    */
  ejs.NestedAggregation = function (name) {

    var
      _common = ejs.AggregationMixin(name),
      agg = _common.toJSON();

    agg[name].nested = {};

    return extend(_common, {

      /**
      <p>Sets the nested path.</p>

      @member ejs.NestedAggregation
      @param {String} path The nested path value.
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      path: function (path) {
        if (path == null) {
          return agg[name].nested.path;
        }

        agg[name].nested.path = path;
        return this;
      }

    });
  };

  /**
    @class
    <p>A multi-value metrics aggregation that calculates one or more percentiles
    over numeric values extracted from the aggregated documents. These values can
    be extracted either from specific numeric fields in the documents, or be
    generated by a provided script.</p>

    @name ejs.PercentilesAggregation
    @ejs aggregation
    @borrows ejs.MetricsAggregationMixin.field as field
    @borrows ejs.MetricsAggregationMixin.script as script
    @borrows ejs.MetricsAggregationMixin.lang as lang
    @borrows ejs.MetricsAggregationMixin.scriptValuesSorted as scriptValuesSorted
    @borrows ejs.MetricsAggregationMixin.params as params
    @borrows ejs.AggregationMixin._type as _type
    @borrows ejs.AggregationMixin.toJSON as toJSON

    @desc
    <p>Aggregation that calculates one or more percentiles over numeric values
    extracted from the aggregated documents.</p>

    @param {String} name The name which be used to refer to this aggregation.

    */
  ejs.PercentilesAggregation = function (name) {

    var
      _common = ejs.MetricsAggregationMixin(name, 'percentiles'),
      agg = _common.toJSON();

    return extend(_common, {

      /**
      Enable the response to be returned as a keyed object where the key is the
      bucket interval.

      @member ejs.PercentilesAggregation
      @param {Boolean} trueFalse to enable keyed response or not
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      keyed: function (trueFalse) {
        if (trueFalse == null) {
          return agg[name].percentiles.keyed;
        }

        agg[name].percentiles.keyed = trueFalse;
        return this;
      },

      /**
      Sets the percentile bucket array.  Overwrites all existing values.

      @member ejs.PercentilesAggregation
      @param {Double[]} percents A double array of percentiles
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      percents: function (percentArr) {
        if (percentArr == null) {
          return agg[name].percentiles.percents;
        }

        if (!isArray(percentArr)) {
          throw new TypeError('Percents must be an array of doubles');
        }

        agg[name].percentiles.percents = percentArr;
        return this;
      },

      /**
      Add a single percentile to the current list of percentiles.

      @member ejs.PercentilesAggregation
      @param {Double} percentile A double percentile value to add
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      percent: function (percentile) {
        if (agg[name].percentiles.percents == null) {
          agg[name].percentiles.percents = [];
        }

        if (percentile == null) {
          return agg[name].percentiles.percents;
        }

        agg[name].percentiles.percents.push(percentile);
        return this;
      },

      /**
      Compression controls memory usage and approximation error. The compression
      value limits the maximum number of nodes to 100 * compression.  By
      increasing the compression value, you can increase the accuracy of your
      percentiles at the cost of more memory. Larger compression values also make
      the algorithm slower since the underlying tree data structure grows in
      size, resulting in more expensive operations. The default compression
      value is 100.

      @member ejs.PercentilesAggregation
      @param {Integer} c The compression level.
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      compression: function (c) {
        if (c == null) {
          return agg[name].percentiles.compression;
        }

        agg[name].percentiles.compression = c;
        return this;
      }

    });
  };

  /**
    @class
    <p>A multi-bucket value source based aggregation that enables the user to
    define a set of ranges - each representing a bucket. During the aggregation
    process, the values extracted from each document will be checked against each
    bucket range and "bucket" the relevant/matching document.</p>

    <p>Note that this aggregration includes the from value and excludes the to
    value for each range.</p>

    @name ejs.RangeAggregation
    @ejs aggregation
    @borrows ejs.AggregationMixin.aggregation as aggregation
    @borrows ejs.AggregationMixin.agg as agg
    @borrows ejs.AggregationMixin._type as _type
    @borrows ejs.AggregationMixin.toJSON as toJSON

    @desc
    <p>Aggregation that enables the user to define a set of ranges that each
    represent a bucket.</p>

    @param {String} name The name which be used to refer to this aggregation.

    */
  ejs.RangeAggregation = function (name) {

    var
      _common = ejs.AggregationMixin(name),
      agg = _common.toJSON();

    agg[name].range = {};

    return extend(_common, {

      /**
      <p>Sets the field to gather terms from.</p>

      @member ejs.RangeAggregation
      @param {String} field a valid field name..
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      field: function (field) {
        if (field == null) {
          return agg[name].range.field;
        }

        agg[name].range.field = field;
        return this;
      },

      /**
      Allows you generate or modify the terms using a script.

      @member ejs.RangeAggregation
      @param {String} scriptCode A valid script string to execute.
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      script: function (scriptCode) {
        if (scriptCode == null) {
          return agg[name].range.script;
        }

        agg[name].range.script = scriptCode;
        return this;
      },

      /**
      The script language being used.

      @member ejs.RangeAggregation
      @param {String} language The language of the script.
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      lang: function (language) {
        if (language == null) {
          return agg[name].range.lang;
        }

        agg[name].range.lang = language;
        return this;
      },

      /**
      Adds a range to the list of exsiting range expressions.

      @member ejs.RangeAggregation
      @param {String} from The start value, use null to ignore
      @param {String} to The end value, use null to ignore.
      @param {String} key Optional key/bucket name for keyed responses.
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      range: function (from, to, key) {
        var rangeObj = {};
        if (agg[name].range.ranges == null) {
          agg[name].range.ranges = [];
        }

        if (from == null && to == null) {
          return agg[name].range.ranges;
        }

        if (from != null) {
          rangeObj.from = from;
        }

        if (to != null) {
          rangeObj.to = to;
        }

        if (key != null) {
          rangeObj.key = key;
        }

        agg[name].range.ranges.push(rangeObj);
        return this;
      },

      /**
      Enable the response to be returned as a keyed object where the key is the
      bucket interval.

      @member ejs.RangeAggregation
      @param {Boolean} trueFalse to enable keyed response or not
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      keyed: function (trueFalse) {
        if (trueFalse == null) {
          return agg[name].range.keyed;
        }

        agg[name].range.keyed = trueFalse;
        return this;
      },

      /**
      Set to true to assume script values are sorted.

      @member ejs.RangeAggregation
      @param {Boolean} trueFalse assume sorted values or not
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      scriptValuesSorted: function (trueFalse) {
        if (trueFalse == null) {
          return agg[name].range.script_values_sorted;
        }

        agg[name].range.script_values_sorted = trueFalse;
        return this;
      },

      /**
      Sets parameters that will be applied to the script.  Overwrites
      any existing params.

      @member ejs.RangeAggregation
      @param {Object} p An object where the keys are the parameter name and
        values are the parameter value.
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      params: function (p) {
        if (p == null) {
          return agg[name].range.params;
        }

        agg[name].range.params = p;
        return this;
      }

    });
  };

  /**
    @class
    <p>An aggregation that returns interesting or unusual occurrences of terms in
    a set.</p>

    @name ejs.SignificantTermsAggregation
    @ejs aggregation
    @borrows ejs.AggregationMixin.aggregation as aggregation
    @borrows ejs.AggregationMixin.agg as agg
    @borrows ejs.AggregationMixin._type as _type
    @borrows ejs.AggregationMixin.toJSON as toJSON

    @desc
    <p>An aggregation that returns interesting or unusual occurrences of terms in
    a set.</p>

    @param {String} name The name which be used to refer to this aggregation.

    */
  ejs.SignificantTermsAggregation = function (name) {

    var
      _common = ejs.AggregationMixin(name),
      agg = _common.toJSON();

    agg[name].significant_terms = {};

    return extend(_common, {

      /**
      <p>Sets the field to gather terms from.</p>

      @member ejs.SignificantTermsAggregation
      @param {String} field a valid field name..
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      field: function (field) {
        if (field == null) {
          return agg[name].significant_terms.field;
        }

        agg[name].significant_terms.field = field;
        return this;
      },

      /**
      Sets the format expression for the terms.  Use for number or date
      formatting.

      @member ejs.SignificantTermsAggregation
      @param {String} f the format string
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      format: function (f) {
        if (f == null) {
          return agg[name].significant_terms.format;
        }

        agg[name].significant_terms.format = f;
        return this;
      },

      /**
      <p>Allows you to allow only specific entries using a regular
      expression.  You can also optionally pass in a set of flags to apply
      to the regular expression.  Valid flags are: CASE_INSENSITIVE,
      MULTILINE, DOTALL, UNICODE_CASE, CANON_EQ, UNIX_LINES, LITERAL,
      COMMENTS, and UNICODE_CHAR_CLASS.  Separate multiple flags with a |
      character.</p>

      @member ejs.SignificantTermsAggregation
      @param {String} include A regular expression include string
      @param {String} flags Optional regular expression flags..
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      include: function (include, flags) {
        if (agg[name].significant_terms.include == null) {
          agg[name].significant_terms.include = {};
        }

        if (include == null) {
          return agg[name].significant_terms.include;
        }

        agg[name].significant_terms.include.pattern = include;
        if (flags != null) {
          agg[name].significant_terms.include.flags = flags;
        }

        return this;
      },

      /**
      <p>Allows you to filter out unwanted facet entries using a regular
      expression.  You can also optionally pass in a set of flags to apply
      to the regular expression.  Valid flags are: CASE_INSENSITIVE,
      MULTILINE, DOTALL, UNICODE_CASE, CANON_EQ, UNIX_LINES, LITERAL,
      COMMENTS, and UNICODE_CHAR_CLASS.  Separate multiple flags with a |
      character.</p>

      @member ejs.SignificantTermsAggregation
      @param {String} exclude A regular expression exclude string
      @param {String} flags Optional regular expression flags..
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      exclude: function (exclude, flags) {
        if (agg[name].significant_terms.exclude == null) {
          agg[name].significant_terms.exclude = {};
        }

        if (exclude == null) {
          return agg[name].significant_terms.exclude;
        }

        agg[name].significant_terms.exclude.pattern = exclude;
        if (flags != null) {
          agg[name].significant_terms.exclude.flags = flags;
        }

        return this;
      },

      /**
      Sets the execution hint determines how the aggregation is computed.
      Supported values are: map and ordinals.

      @member ejs.SignificantTermsAggregation
      @param {String} h The hint value as a string.
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      executionHint: function (h) {
        if (h == null) {
          return agg[name].significant_terms.execution_hint;
        }

        h = h.toLowerCase();
        if (h === 'map' || h === 'ordinals') {
          agg[name].significant_terms.execution_hint = h;
        }

        return this;
      },

      /**
      Sets the number of aggregation entries that will be returned.

      @member ejs.SignificantTermsAggregation
      @param {Integer} size The numer of aggregation entries to be returned.
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      size: function (size) {
        if (size == null) {
          return agg[name].significant_terms.size;
        }

        agg[name].significant_terms.size = size;
        return this;
      },


      /**
      Determines how many terms the coordinating node will request from
      each shard.

      @member ejs.SignificantTermsAggregation
      @param {Integer} shardSize The numer of terms to fetch from each shard.
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      shardSize: function (shardSize) {
        if (shardSize == null) {
          return agg[name].significant_terms.shard_size;
        }

        agg[name].significant_terms.shard_size = shardSize;
        return this;
      },

      /**
      Only return terms that match more than a configured number of hits.

      @member ejs.SignificantTermsAggregation
      @param {Integer} num The numer of minimum number of hits.
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      minDocCount: function (num) {
        if (num == null) {
          return agg[name].significant_terms.min_doc_count;
        }

        agg[name].significant_terms.min_doc_count = num;
        return this;
      }

    });
  };

  /**
    @class
    <p>A multi-value metrics aggregation that computes stats over numeric values
    extracted from the aggregated documents. These values can be extracted either
    from specific numeric fields in the documents, or be generated by a provided
    script.</p>

    <p>The stats that are returned consist of: min, max, sum, count and avg.</p>

    @name ejs.StatsAggregation
    @ejs aggregation
    @borrows ejs.MetricsAggregationMixin.field as field
    @borrows ejs.MetricsAggregationMixin.script as script
    @borrows ejs.MetricsAggregationMixin.lang as lang
    @borrows ejs.MetricsAggregationMixin.scriptValuesSorted as scriptValuesSorted
    @borrows ejs.MetricsAggregationMixin.params as params
    @borrows ejs.AggregationMixin._type as _type
    @borrows ejs.AggregationMixin.toJSON as toJSON

    @desc
    <p>Aggregation that computes stats over numeric values extracted from the
    aggregated documents.</p>

    @param {String} name The name which be used to refer to this aggregation.

    */
  ejs.StatsAggregation = function (name) {

    var
      _common = ejs.MetricsAggregationMixin(name, 'stats'),
      agg = _common.toJSON();

    return _common;
  };

  /**
    @class
    <p>A single-value metrics aggregation that sums up numeric values that are
    extracted from the aggregated documents. These values can be extracted either
    from specific numeric fields in the documents, or be generated by a
    provided script.</p>

    @name ejs.SumAggregation
    @ejs aggregation
    @borrows ejs.MetricsAggregationMixin.field as field
    @borrows ejs.MetricsAggregationMixin.script as script
    @borrows ejs.MetricsAggregationMixin.lang as lang
    @borrows ejs.MetricsAggregationMixin.scriptValuesSorted as scriptValuesSorted
    @borrows ejs.MetricsAggregationMixin.params as params
    @borrows ejs.AggregationMixin._type as _type
    @borrows ejs.AggregationMixin.toJSON as toJSON

    @desc
    <p>Aggregation that sums up numeric values that are extracted from the
    aggregated documents.</p>

    @param {String} name The name which be used to refer to this aggregation.

    */
  ejs.SumAggregation = function (name) {

    var
      _common = ejs.MetricsAggregationMixin(name, 'sum'),
      agg = _common.toJSON();

    return _common;
  };

  /**
    @class
    <p>A multi-bucket value source based aggregation where buckets are dynamically
    built - one per unique value.</p>

    @name ejs.TermsAggregation
    @ejs aggregation
    @borrows ejs.AggregationMixin.aggregation as aggregation
    @borrows ejs.AggregationMixin.agg as agg
    @borrows ejs.AggregationMixin._type as _type
    @borrows ejs.AggregationMixin.toJSON as toJSON

    @desc
    <p>Defines an aggregation of unique values/terms.</p>

    @param {String} name The name which be used to refer to this aggregation.

    */
  ejs.TermsAggregation = function (name) {

    var
      _common = ejs.AggregationMixin(name),
      agg = _common.toJSON();

    agg[name].terms = {};

    return extend(_common, {

      /**
      <p>Sets the field to gather terms from.</p>

      @member ejs.TermsAggregation
      @param {String} field a valid field name..
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      field: function (field) {
        if (field == null) {
          return agg[name].terms.field;
        }

        agg[name].terms.field = field;
        return this;
      },

      /**
      Allows you generate or modify the terms using a script.

      @member ejs.TermsAggregation
      @param {String} scriptCode A valid script string to execute.
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      script: function (scriptCode) {
        if (scriptCode == null) {
          return agg[name].terms.script;
        }

        agg[name].terms.script = scriptCode;
        return this;
      },

      /**
      The script language being used.

      @member ejs.TermsAggregation
      @param {String} language The language of the script.
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      lang: function (language) {
        if (language == null) {
          return agg[name].terms.lang;
        }

        agg[name].terms.lang = language;
        return this;
      },

      /**
      Sets the type of the field value for use in scripts.  Current values are:
      string, double, float, long, integer, short, and byte.

      @member ejs.TermsAggregation
      @param {String} v The value type
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      valueType: function (v) {
        if (v == null) {
          return agg[name].terms.value_type;
        }

        v = v.toLowerCase();
        if (v === 'string' || v === 'double' || v === 'float' || v === 'long' ||
            v === 'integer' || v === 'short' || v === 'byte') {
          agg[name].terms.value_type = v;
        }

        return this;
      },

      /**
      Sets the format expression for the terms.  Use for number or date
      formatting

      @member ejs.TermsAggregation
      @param {String} f the format string
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      format: function (f) {
        if (f == null) {
          return agg[name].terms.format;
        }

        agg[name].terms.format = f;
        return this;
      },

      /**
      <p>Allows you to allow only specific entries using a regular
      expression.  You can also optionally pass in a set of flags to apply
      to the regular expression.  Valid flags are: CASE_INSENSITIVE,
      MULTILINE, DOTALL, UNICODE_CASE, CANON_EQ, UNIX_LINES, LITERAL,
      COMMENTS, and UNICODE_CHAR_CLASS.  Separate multiple flags with a |
      character.</p>

      @member ejs.TermsAggregation
      @param {String} include A regular expression include string
      @param {String} flags Optional regular expression flags..
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      include: function (include, flags) {
        if (agg[name].terms.include == null) {
          agg[name].terms.include = {};
        }

        if (include == null) {
          return agg[name].terms.include;
        }

        agg[name].terms.include.pattern = include;
        if (flags != null) {
          agg[name].terms.include.flags = flags;
        }

        return this;
      },

      /**
      <p>Allows you to filter out unwanted facet entries using a regular
      expression.  You can also optionally pass in a set of flags to apply
      to the regular expression.  Valid flags are: CASE_INSENSITIVE,
      MULTILINE, DOTALL, UNICODE_CASE, CANON_EQ, UNIX_LINES, LITERAL,
      COMMENTS, and UNICODE_CHAR_CLASS.  Separate multiple flags with a |
      character.</p>

      @member ejs.TermsAggregation
      @param {String} exclude A regular expression exclude string
      @param {String} flags Optional regular expression flags..
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      exclude: function (exclude, flags) {
        if (agg[name].terms.exclude == null) {
          agg[name].terms.exclude = {};
        }

        if (exclude == null) {
          return agg[name].terms.exclude;
        }

        agg[name].terms.exclude.pattern = exclude;
        if (flags != null) {
          agg[name].terms.exclude.flags = flags;
        }

        return this;
      },

      /**
      Sets the execution hint determines how the aggregation is computed.
      Supported values are: map and ordinals.

      @member ejs.TermsAggregation
      @param {String} h The hint value as a string.
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      executionHint: function (h) {
        if (h == null) {
          return agg[name].terms.execution_hint;
        }

        h = h.toLowerCase();
        if (h === 'map' || h === 'ordinals') {
          agg[name].terms.execution_hint = h;
        }

        return this;
      },

      /**
      Set to true to assume script values are unique.

      @member ejs.TermsAggregation
      @param {Boolean} trueFalse assume unique values or not
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      scriptValuesUnique: function (trueFalse) {
        if (trueFalse == null) {
          return agg[name].terms.script_values_unique;
        }

        agg[name].terms.script_values_unique = trueFalse;
        return this;
      },

      /**
      Sets the number of aggregation entries that will be returned.

      @member ejs.TermsAggregation
      @param {Integer} size The numer of aggregation entries to be returned.
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      size: function (size) {
        if (size == null) {
          return agg[name].terms.size;
        }

        agg[name].terms.size = size;
        return this;
      },


      /**
      Determines how many terms the coordinating node will request from
      each shard.

      @member ejs.TermsAggregation
      @param {Integer} shardSize The numer of terms to fetch from each shard.
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      shardSize: function (shardSize) {
        if (shardSize == null) {
          return agg[name].terms.shard_size;
        }

        agg[name].terms.shard_size = shardSize;
        return this;
      },

      /**
      Only return terms that match more than a configured number of hits.

      @member ejs.TermsAggregation
      @param {Integer} num The numer of minimum number of hits.
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      minDocCount: function (num) {
        if (num == null) {
          return agg[name].terms.min_doc_count;
        }

        agg[name].terms.min_doc_count = num;
        return this;
      },

      /**
      Sets parameters that will be applied to the script.  Overwrites
      any existing params.

      @member ejs.TermsAggregation
      @param {Object} p An object where the keys are the parameter name and
        values are the parameter value.
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      params: function (p) {
        if (p == null) {
          return agg[name].terms.params;
        }

        agg[name].terms.params = p;
        return this;
      },

      /**
      Sets order for the aggregated values.

      @member ejs.TermsAggregation
      @param {String} order The order string.
      @param {String} direction The sort direction, asc or desc.
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      order: function (order, direction) {
        if (order == null) {
          return agg[name].terms.order;
        }

        if (direction == null) {
          direction = 'desc';
        }

        direction = direction.toLowerCase();
        if (direction !== 'asc' && direction !== 'desc') {
          direction = 'desc';
        }

        agg[name].terms.order = {};
        agg[name].terms.order[order] = direction;
        return this;
      }

    });
  };

  /**
    @class
    <p>A single-value metrics aggregation that counts the number of values that
    are extracted from the aggregated documents. These values can be extracted
    either from specific fields in the documents, or be generated by a provided
    script. Typically, this aggregator will be used in conjunction with other
    single-value aggregations.</p>

    @name ejs.ValueCountAggregation
    @ejs aggregation
    @borrows ejs.MetricsAggregationMixin.field as field
    @borrows ejs.MetricsAggregationMixin.script as script
    @borrows ejs.MetricsAggregationMixin.lang as lang
    @borrows ejs.MetricsAggregationMixin.params as params
    @borrows ejs.AggregationMixin._type as _type
    @borrows ejs.AggregationMixin.toJSON as toJSON

    @desc
    <p>Aggregation that counts the number of values that are extracted from the
    aggregated documents.</p>

    @param {String} name The name which be used to refer to this aggregation.

    */
  ejs.ValueCountAggregation = function (name) {

    var
      _common = ejs.MetricsAggregationMixin(name, 'value_count'),
      agg = _common.toJSON();

    // not supported in value count aggregation
    delete _common.scriptValuesSorted;

    return extend(_common, {

      /**
      Set to true to assume script values are unique.

      @member ejs.ValueCountAggregation
      @param {Boolean} trueFalse assume unique values or not
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      scriptValuesUnique: function (trueFalse) {
        if (trueFalse == null) {
          return agg[name].value_count.script_values_unique;
        }

        agg[name].value_count.script_values_unique = trueFalse;
        return this;
      }

    });

  };

  /**
    @class
    A container Filter that allows Boolean AND composition of Filters.

    @name ejs.AndFilter
    @ejs filter
    @borrows ejs.FilterMixin.name as name
    @borrows ejs.FilterMixin.cache as cache
    @borrows ejs.FilterMixin.cacheKey as cacheKey
    @borrows ejs.FilterMixin._type as _type
    @borrows ejs.FilterMixin.toJSON as toJSON

    @desc
    A container Filter that allows Boolean AND composition of Filters.

    @param {(Filter|Filter[])} f A single Filter object or an array of valid 
      Filter objects.
    */
  ejs.AndFilter = function (f) {

    var
      i,
      len,
      _common = ejs.FilterMixin('and'),
      filter = _common.toJSON();
    
    filter.and.filters = [];
    
    if (isFilter(f)) {
      filter.and.filters.push(f.toJSON());
    } else if (isArray(f)) {
      for (i = 0, len = f.length; i < len; i++) {
        if (!isFilter(f[i])) {
          throw new TypeError('Array must contain only Filter objects');
        }
        
        filter.and.filters.push(f[i].toJSON());
      }
    } else {
      throw new TypeError('Argument must be a Filter or Array of Filters');
    }

    return extend(_common, {

      /**
             Sets the filters for the filter.  If fltr is a single 
             Filter, it is added to the current filters.  If fltr is an array
             of Filters, then they replace all existing filters.

             @member ejs.AndFilter
             @param {(Filter|Filter[])} fltr A valid filter object or an array of filters.
             @returns {Object} returns <code>this</code> so that calls can be chained.
             */
      filters: function (fltr) {
        var i,
          len;
          
        if (fltr == null) {
          return filter.and.filters;
        }
      
        if (isFilter(fltr)) {
          filter.and.filters.push(fltr.toJSON());
        } else if (isArray(fltr)) {
          filter.and.filters = [];
          for (i = 0, len = fltr.length; i < len; i++) {
            if (!isFilter(fltr[i])) {
              throw new TypeError('Array must contain only Filter objects');
            }
            
            filter.and.filters.push(fltr[i].toJSON());
          }
        } else {
          throw new TypeError('Argument must be a Filter or an Array of Filters');
        }
        
        return this;
      }
      
    });
  };

  /**
    @class
    <p>A <code>BoolFilter</code> allows you to build <em>Boolean</em> filter constructs
    from individual filters. Similar in concept to Boolean query, except that 
    the clauses are other filters. Can be placed within queries that accept a 
    filter.
  
    @name ejs.BoolFilter
    @ejs filter
    @borrows ejs.FilterMixin.name as name
    @borrows ejs.FilterMixin.cache as cache
    @borrows ejs.FilterMixin.cacheKey as cacheKey
    @borrows ejs.FilterMixin._type as _type
    @borrows ejs.FilterMixin.toJSON as toJSON

    @desc
    A Filter that matches documents matching boolean combinations of other
    filters.

    */
  ejs.BoolFilter = function () {

    var
      _common = ejs.FilterMixin('bool'),
      filter = _common.toJSON();

    return extend(_common, {

      /**
             Adds filter to boolean container. Given filter "must" appear in 
             matching documents.  If passed a single Filter it is added to the
             list of existing filters.  If passed an array of Filters, they
             replace all existing filters.

             @member ejs.BoolFilter
             @param {(Filter|Filter[])} oFilter A valid Filter or array of
              Filter objects.
             @returns {Object} returns <code>this</code> so that calls can be chained.
             */
      must: function (oFilter) {
        var i, len;
        
        if (filter.bool.must == null) {
          filter.bool.must = [];
        }
    
        if (oFilter == null) {
          return filter.bool.must;
        }

        if (isFilter(oFilter)) {
          filter.bool.must.push(oFilter.toJSON());
        } else if (isArray(oFilter)) {
          filter.bool.must = [];
          for (i = 0, len = oFilter.length; i < len; i++) {
            if (!isFilter(oFilter[i])) {
              throw new TypeError('Argument must be an array of Filters');
            }
            
            filter.bool.must.push(oFilter[i].toJSON());
          }
        } else {
          throw new TypeError('Argument must be a Filter or array of Filters');
        }
        
        return this;
      },

      /**
             Adds filter to boolean container. Given filter "must not" appear 
             in matching documents. If passed a single Filter it is added to 
             the list of existing filters.  If passed an array of Filters, 
             they replace all existing filters.

             @member ejs.BoolFilter
             @param {(Filter|Filter[])} oFilter A valid Filter or array of
               Filter objects.
             @returns {Object} returns <code>this</code> so that calls can be chained.
             */
      mustNot: function (oFilter) {
        var i, len;
        
        if (filter.bool.must_not == null) {
          filter.bool.must_not = [];
        }

        if (oFilter == null) {
          return filter.bool.must_not;
        }
    
        if (isFilter(oFilter)) {
          filter.bool.must_not.push(oFilter.toJSON());
        } else if (isArray(oFilter)) {
          filter.bool.must_not = [];
          for (i = 0, len = oFilter.length; i < len; i++) {
            if (!isFilter(oFilter[i])) {
              throw new TypeError('Argument must be an array of Filters');
            }
            
            filter.bool.must_not.push(oFilter[i].toJSON());
          }
        } else {
          throw new TypeError('Argument must be a Filter or array of Filters');
        }
        
        return this;
      },

      /**
             Adds filter to boolean container. Given filter "should" appear in 
             matching documents. If passed a single Filter it is added to 
             the list of existing filters.  If passed an array of Filters, 
             they replace all existing filters.

             @member ejs.BoolFilter
             @param {(Filter|Filter[])} oFilter A valid Filter or array of
                Filter objects.
             @returns {Object} returns <code>this</code> so that calls can be chained.
             */
      should: function (oFilter) {
        var i, len;
        
        if (filter.bool.should == null) {
          filter.bool.should = [];
        }

        if (oFilter == null) {
          return filter.bool.should;
        }
    
        if (isFilter(oFilter)) {
          filter.bool.should.push(oFilter.toJSON());
        } else if (isArray(oFilter)) {
          filter.bool.should = [];
          for (i = 0, len = oFilter.length; i < len; i++) {
            if (!isFilter(oFilter[i])) {
              throw new TypeError('Argument must be an array of Filters');
            }
            
            filter.bool.should.push(oFilter[i].toJSON());
          }
        } else {
          throw new TypeError('Argument must be a Filter or array of Filters');
        }
        
        return this;
      }
      
    });
  };

  /**
    @class
    <p>An existsFilter matches documents where the specified field is present
    and the field contains a legitimate value.</p>

    @name ejs.ExistsFilter
    @ejs filter
    @borrows ejs.FilterMixin.name as name
    @borrows ejs.FilterMixin.cache as cache
    @borrows ejs.FilterMixin.cacheKey as cacheKey
    @borrows ejs.FilterMixin._type as _type
    @borrows ejs.FilterMixin.toJSON as toJSON

    @desc
    Filters documents where a specified field exists and contains a value.

    @param {String} fieldName the field name that must exists and contain a value.
    */
  ejs.ExistsFilter = function (fieldName) {

    var 
      _common = ejs.FilterMixin('exists'),
      filter = _common.toJSON();
    
    filter.exists.field = fieldName;

    return extend(_common, {

      /**
            Sets the field to check for missing values.

            @member ejs.ExistsFilter
            @param {String} name A name of the field.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      field: function (name) {
        if (name == null) {
          return filter.exists.field;
        }

        filter.exists.field = name;
        return this;
      }
      
    });
  };

  /**
    @class
    <p>A filter that restricts matched results/docs to a geographic bounding box described by
    the specified lon and lat coordinates. The format conforms with the GeoJSON specification.</p>

    @name ejs.GeoBboxFilter
    @ejs filter
    @borrows ejs.FilterMixin.name as name
    @borrows ejs.FilterMixin.cache as cache
    @borrows ejs.FilterMixin.cacheKey as cacheKey
    @borrows ejs.FilterMixin._type as _type
    @borrows ejs.FilterMixin.toJSON as toJSON

    @desc
    Filter results to those which are contained within the defined bounding box.

    @param {String} fieldName the document property/field containing the Geo Point (lon/lat).

    */
  ejs.GeoBboxFilter = function (fieldName) {

    var
      _common = ejs.FilterMixin('geo_bounding_box'),
      filter = _common.toJSON();
    
    filter.geo_bounding_box[fieldName] = {};

    return extend(_common, {

      /**
            Sets the fields to filter against.

            @member ejs.GeoBboxFilter
            @param {String} f A valid field name.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      field: function (f) {
        var oldValue = filter.geo_bounding_box[fieldName];
    
        if (f == null) {
          return fieldName;
        }

        delete filter.geo_bounding_box[fieldName];
        fieldName = f;
        filter.geo_bounding_box[f] = oldValue;
    
        return this;
      },
      
      /**
             Sets the top-left coordinate of the bounding box

             @member ejs.GeoBboxFilter
             @param {GeoPoint} p A valid GeoPoint object
             @returns {Object} returns <code>this</code> so that calls can be chained.
             */
      topLeft: function (p) {
        if (p == null) {
          return filter.geo_bounding_box[fieldName].top_left;
        }
      
        if (isGeoPoint(p)) {
          filter.geo_bounding_box[fieldName].top_left = p.toJSON();
        } else {
          throw new TypeError('Argument must be a GeoPoint');
        }
        
        return this;
      },

      /**
             Sets the bottom-right coordinate of the bounding box

             @member ejs.GeoBboxFilter
             @param {GeoPoint} p A valid GeoPoint object
             @returns {Object} returns <code>this</code> so that calls can be chained.
             */
      bottomRight: function (p) {
        if (p == null) {
          return filter.geo_bounding_box[fieldName].bottom_right;
        }
      
        if (isGeoPoint(p)) {
          filter.geo_bounding_box[fieldName].bottom_right = p.toJSON();
        } else {
          throw new TypeError('Argument must be a GeoPoint');
        }
        
        return this;
      },

      /**
            Sets the type of the bounding box execution. Valid values are
            "memory" and "indexed".  Default is memory.

            @member ejs.GeoBboxFilter
            @param {String} type The execution type as a string.  
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      type: function (type) {
        if (type == null) {
          return filter.geo_bounding_box.type;
        }

        type = type.toLowerCase();
        if (type === 'memory' || type === 'indexed') {
          filter.geo_bounding_box.type = type;
        }
        
        return this;
      },
      
      /**
            If the lat/long points should be normalized to lie within their
            respective normalized ranges.
            
            Normalized ranges are:
            lon = -180 (exclusive) to 180 (inclusive) range
            lat = -90 to 90 (both inclusive) range

            @member ejs.GeoBboxFilter
            @param {String} trueFalse True if the coordinates should be normalized. False otherwise.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      normalize: function (trueFalse) {
        if (trueFalse == null) {
          return filter.geo_bounding_box.normalize;
        }

        filter.geo_bounding_box.normalize = trueFalse;
        return this;
      }
      
    });
  };

  /**
    @class
    <p>A filter that restricts matched results/docs to a given distance from the
    point of origin. The format conforms with the GeoJSON specification.</p>

    @name ejs.GeoDistanceFilter
    @ejs filter
    @borrows ejs.FilterMixin.name as name
    @borrows ejs.FilterMixin.cache as cache
    @borrows ejs.FilterMixin.cacheKey as cacheKey
    @borrows ejs.FilterMixin._type as _type
    @borrows ejs.FilterMixin.toJSON as toJSON

    @desc
    Filter results to those which fall within the given distance of the point of origin.

    @param {String} fieldName the document property/field containing the Geo Point (lon/lat).

    */
  ejs.GeoDistanceFilter = function (fieldName) {

    var
      _common = ejs.FilterMixin('geo_distance'),
      filter = _common.toJSON();

    filter.geo_distance[fieldName] = [0, 0];
    
    return extend(_common, {

      /**
            Sets the fields to filter against.

            @member ejs.GeoDistanceFilter
            @param {String} f A valid field name.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      field: function (f) {
        var oldValue = filter.geo_distance[fieldName];
    
        if (f == null) {
          return fieldName;
        }

        delete filter.geo_distance[fieldName];
        fieldName = f;
        filter.geo_distance[f] = oldValue;
    
        return this;
      },
      
      /**
             Sets the numeric distance to be used.  The distance can be a 
             numeric value, and then the unit (either mi or km can be set) 
             controlling the unit. Or a single string with the unit as well.

             @member ejs.GeoDistanceFilter
             @param {Number} numericDistance the numeric distance
             @returns {Object} returns <code>this</code> so that calls can be chained.
             */
      distance: function (numericDistance) {
        if (numericDistance == null) {
          return filter.geo_distance.distance;
        }
      
        if (!isNumber(numericDistance)) {
          throw new TypeError('Argument must be a numeric value');
        }
        
        filter.geo_distance.distance = numericDistance;
        return this;
      },

      /**
             Sets the distance unit.  Valid values are "mi" for miles or "km"
             for kilometers. Defaults to "km".

             @member ejs.GeoDistanceFilter
             @param {Number} unit the unit of distance measure.
             @returns {Object} returns <code>this</code> so that calls can be chained.
             */
      unit: function (unit) {
        if (unit == null) {
          return filter.geo_distance.unit;
        }
      
        unit = unit.toLowerCase();
        if (unit === 'mi' || unit === 'km') {
          filter.geo_distance.unit = unit;
        }
        
        return this;
      },

      /**
             Sets the point of origin in which distance will be measured from

             @member ejs.GeoDistanceFilter
             @param {GeoPoint} p A valid GeoPoint object.
             @returns {Object} returns <code>this</code> so that calls can be chained.
             */
      point: function (p) {
        if (p == null) {
          return filter.geo_distance[fieldName];
        }
      
        if (isGeoPoint(p)) {
          filter.geo_distance[fieldName] = p.toJSON();
        } else {
          throw new TypeError('Argument must be a GeoPoint');
        }
        
        return this;
      },


      /**
            How to compute the distance. Can either be arc (better precision) 
            or plane (faster). Defaults to arc.

            @member ejs.GeoDistanceFilter
            @param {String} type The execution type as a string.  
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      distanceType: function (type) {
        if (type == null) {
          return filter.geo_distance.distance_type;
        }

        type = type.toLowerCase();
        if (type === 'arc' || type === 'plane') {
          filter.geo_distance.distance_type = type;
        }
        
        return this;
      },
      
      /**
            If the lat/long points should be normalized to lie within their
            respective normalized ranges.
            
            Normalized ranges are:
            lon = -180 (exclusive) to 180 (inclusive) range
            lat = -90 to 90 (both inclusive) range

            @member ejs.GeoDistanceFilter
            @param {String} trueFalse True if the coordinates should be normalized. False otherwise.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      normalize: function (trueFalse) {
        if (trueFalse == null) {
          return filter.geo_distance.normalize;
        }

        filter.geo_distance.normalize = trueFalse;
        return this;
      },
      
      /**
            Will an optimization of using first a bounding box check will be 
            used. Defaults to memory which will do in memory checks. Can also 
            have values of indexed to use indexed value check, or none which 
            disables bounding box optimization.

            @member ejs.GeoDistanceFilter
            @param {String} t optimization type of memory, indexed, or none.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      optimizeBbox: function (t) {
        if (t == null) {
          return filter.geo_distance.optimize_bbox;
        }

        t = t.toLowerCase();
        if (t === 'memory' || t === 'indexed' || t === 'none') {
          filter.geo_distance.optimize_bbox = t;
        }
        
        return this;
      }
      
    });
  };

  /**
    @class
    <p>A filter that restricts matched results/docs to a given distance range from the
    point of origin. The format conforms with the GeoJSON specification.</p>

    @name ejs.GeoDistanceRangeFilter
    @ejs filter
    @borrows ejs.FilterMixin.name as name
    @borrows ejs.FilterMixin.cache as cache
    @borrows ejs.FilterMixin.cacheKey as cacheKey
    @borrows ejs.FilterMixin._type as _type
    @borrows ejs.FilterMixin.toJSON as toJSON

    @desc
    Filter results to those which fall within the given distance range of the point of origin.

    @param {String} fieldName the document property/field containing the Geo Point (lon/lat).

    */
  ejs.GeoDistanceRangeFilter = function (fieldName) {

    var
      _common = ejs.FilterMixin('geo_distance_range'),
      filter = _common.toJSON();

    filter.geo_distance_range[fieldName] = [0, 0];
    
    return extend(_common, {

     /**
            Sets the fields to filter against.

            @member ejs.GeoDistanceRangeFilter
            @param {String} f A valid field name.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      field: function (f) {
        var oldValue = filter.geo_distance_range[fieldName];

        if (f == null) {
          return fieldName;
        }

        delete filter.geo_distance_range[fieldName];
        fieldName = f;
        filter.geo_distance_range[f] = oldValue;

        return this;
      },
      
      /**
             * Sets the start point of the distance range

             @member ejs.GeoDistanceRangeFilter
             @param {Number} numericDistance the numeric distance
             @returns {Object} returns <code>this</code> so that calls can be chained.
             */
      from: function (numericDistance) {
        if (numericDistance == null) {
          return filter.geo_distance_range.from;
        }
      
        if (!isNumber(numericDistance)) {
          throw new TypeError('Argument must be a numeric value');
        }
        
        filter.geo_distance_range.from = numericDistance;
        return this;
      },

      /**
             * Sets the end point of the distance range

             @member ejs.GeoDistanceRangeFilter
             @param {Number} numericDistance the numeric distance
             @returns {Object} returns <code>this</code> so that calls can be chained.
             */
      to: function (numericDistance) {
        if (numericDistance == null) {
          return filter.geo_distance_range.to;
        }

        if (!isNumber(numericDistance)) {
          throw new TypeError('Argument must be a numeric value');
        }
            
        filter.geo_distance_range.to = numericDistance;
        return this;
      },

      /**
            Should the first from (if set) be inclusive or not. 
            Defaults to true

            @member ejs.GeoDistanceRangeFilter
            @param {Boolean} trueFalse true to include, false to exclude 
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      includeLower: function (trueFalse) {
        if (trueFalse == null) {
          return filter.geo_distance_range.include_lower;
        }

        filter.geo_distance_range.include_lower = trueFalse;
        return this;
      },

      /**
            Should the last to (if set) be inclusive or not. Defaults to true.

            @member ejs.GeoDistanceRangeFilter
            @param {Boolean} trueFalse true to include, false to exclude 
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      includeUpper: function (trueFalse) {
        if (trueFalse == null) {
          return filter.geo_distance_range.include_upper;
        }

        filter.geo_distance_range.include_upper = trueFalse;
        return this;
      },

      /**
            Greater than value.  Same as setting from to the value, and 
            include_lower to false,

            @member ejs.GeoDistanceRangeFilter
            @param {Number} val the numeric distance
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      gt: function (val) {
        if (val == null) {
          return filter.geo_distance_range.gt;
        }

        if (!isNumber(val)) {
          throw new TypeError('Argument must be a numeric value');
        }
        
        filter.geo_distance_range.gt = val;
        return this;
      },

      /**
            Greater than or equal to value.  Same as setting from to the value,
            and include_lower to true.

            @member ejs.GeoDistanceRangeFilter
            @param {Number} val the numeric distance
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      gte: function (val) {
        if (val == null) {
          return filter.geo_distance_range.gte;
        }

        if (!isNumber(val)) {
          throw new TypeError('Argument must be a numeric value');
        }
        
        filter.geo_distance_range.gte = val;
        return this;
      },

      /**
            Less than value.  Same as setting to to the value, and include_upper 
            to false.

            @member ejs.GeoDistanceRangeFilter
            @param {Number} val the numeric distance
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      lt: function (val) {
        if (val == null) {
          return filter.geo_distance_range.lt;
        }

        if (!isNumber(val)) {
          throw new TypeError('Argument must be a numeric value');
        }
        
        filter.geo_distance_range.lt = val;
        return this;
      },

      /**
            Less than or equal to value.  Same as setting to to the value, 
            and include_upper to true.

            @member ejs.GeoDistanceRangeFilter
            @param {Number} val the numeric distance
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      lte: function (val) {
        if (val == null) {
          return filter.geo_distance_range.lte;
        }

        if (!isNumber(val)) {
          throw new TypeError('Argument must be a numeric value');
        }
        
        filter.geo_distance_range.lte = val;
        return this;
      },
      
      /**
             Sets the distance unit.  Valid values are "mi" for miles or "km"
             for kilometers. Defaults to "km".

             @member ejs.GeoDistanceRangeFilter
             @param {Number} unit the unit of distance measure.
             @returns {Object} returns <code>this</code> so that calls can be chained.
             */
      unit: function (unit) {
        if (unit == null) {
          return filter.geo_distance_range.unit;
        }
      
        unit = unit.toLowerCase();
        if (unit === 'mi' || unit === 'km') {
          filter.geo_distance_range.unit = unit;
        }
        
        return this;
      },

      /**
             Sets the point of origin in which distance will be measured from

             @member ejs.GeoDistanceRangeFilter
             @param {GeoPoint} p A valid GeoPoint object.
             @returns {Object} returns <code>this</code> so that calls can be chained.
             */
      point: function (p) {
        if (p == null) {
          return filter.geo_distance_range[fieldName];
        }
      
        if (isGeoPoint(p)) {
          filter.geo_distance_range[fieldName] = p.toJSON();
        } else {
          throw new TypeError('Argument must be a GeoPoint');
        }
        
        return this;
      },


      /**
            How to compute the distance. Can either be arc (better precision) 
            or plane (faster). Defaults to arc.

            @member ejs.GeoDistanceRangeFilter
            @param {String} type The execution type as a string.  
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      distanceType: function (type) {
        if (type == null) {
          return filter.geo_distance_range.distance_type;
        }

        type = type.toLowerCase();
        if (type === 'arc' || type === 'plane') {
          filter.geo_distance_range.distance_type = type;
        }
        
        return this;
      },
      
      /**
            If the lat/long points should be normalized to lie within their
            respective normalized ranges.
            
            Normalized ranges are:
            lon = -180 (exclusive) to 180 (inclusive) range
            lat = -90 to 90 (both inclusive) range

            @member ejs.GeoDistanceRangeFilter
            @param {String} trueFalse True if the coordinates should be normalized. False otherwise.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      normalize: function (trueFalse) {
        if (trueFalse == null) {
          return filter.geo_distance_range.normalize;
        }

        filter.geo_distance_range.normalize = trueFalse;
        return this;
      },
      
      /**
            Will an optimization of using first a bounding box check will be 
            used. Defaults to memory which will do in memory checks. Can also 
            have values of indexed to use indexed value check, or none which 
            disables bounding box optimization.

            @member ejs.GeoDistanceRangeFilter
            @param {String} t optimization type of memory, indexed, or none.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      optimizeBbox: function (t) {
        if (t == null) {
          return filter.geo_distance_range.optimize_bbox;
        }

        t = t.toLowerCase();
        if (t === 'memory' || t === 'indexed' || t === 'none') {
          filter.geo_distance_range.optimize_bbox = t;
        }
        
        return this;
      }
      
    });
  };

  /**
    @class
    <p>A filter for locating documents that fall within a polygon of points. Simply provide a lon/lat
    for each document as a Geo Point type. The format conforms with the GeoJSON specification.</p>

    @name ejs.GeoPolygonFilter
    @ejs filter
    @borrows ejs.FilterMixin.name as name
    @borrows ejs.FilterMixin.cache as cache
    @borrows ejs.FilterMixin.cacheKey as cacheKey
    @borrows ejs.FilterMixin._type as _type
    @borrows ejs.FilterMixin.toJSON as toJSON

    @desc
    Filter results to those which are contained within the polygon of points.

    @param {String} fieldName the document property/field containing the Geo Point (lon/lat).
    */
  ejs.GeoPolygonFilter = function (fieldName) {

    var
      _common = ejs.FilterMixin('geo_polygon'),
      filter = _common.toJSON(); 

    filter.geo_polygon[fieldName] = {
      points: []
    };

    return extend(_common, {

      /**
           Sets the fields to filter against.

           @member ejs.GeoPolygonFilter
           @param {String} f A valid field name.
           @returns {Object} returns <code>this</code> so that calls can be chained.
           */
      field: function (f) {
        var oldValue = filter.geo_polygon[fieldName];

        if (f == null) {
          return fieldName;
        }

        delete filter.geo_polygon[fieldName];
        fieldName = f;
        filter.geo_polygon[f] = oldValue;

        return this;
      },
       
      /**
             Sets a series of points that represent a polygon.  If passed a 
             single <code>GeoPoint</code> object, it is added to the current 
             list of points.  If passed an array of <code>GeoPoint</code> 
             objects it replaces all current values. 

             @member ejs.GeoPolygonFilter
             @param {Array} pointsArray the array of points that represent the polygon
             @returns {Object} returns <code>this</code> so that calls can be chained.
             */
      points: function (p) {
        var i, len;
        
        if (p == null) {
          return filter.geo_polygon[fieldName].points;
        }
      
        if (isGeoPoint(p)) {
          filter.geo_polygon[fieldName].points.push(p.toJSON());
        } else if (isArray(p)) {
          filter.geo_polygon[fieldName].points = [];
          for (i = 0, len = p.length; i < len; i++) {
            if (!isGeoPoint(p[i])) {
              throw new TypeError('Argument must be Array of GeoPoints');
            }
            
            filter.geo_polygon[fieldName].points.push(p[i].toJSON());
          }
        } else {
          throw new TypeError('Argument must be a GeoPoint or Array of GeoPoints');
        }
        
        return this;
      },

      /**
            If the lat/long points should be normalized to lie within their
            respective normalized ranges.
            
            Normalized ranges are:
            lon = -180 (exclusive) to 180 (inclusive) range
            lat = -90 to 90 (both inclusive) range

            @member ejs.GeoPolygonFilter
            @param {String} trueFalse True if the coordinates should be normalized. False otherwise.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      normalize: function (trueFalse) {
        if (trueFalse == null) {
          return filter.geo_polygon.normalize;
        }

        filter.geo_polygon.normalize = trueFalse;
        return this;
      }
      
    });
  };

  /**
    @class
    <p>Efficient filtering of documents containing shapes indexed using the 
    geo_shape type.</p>

    <p>Much like the geo_shape type, the geo_shape filter uses a grid square 
    representation of the filter shape to find those documents which have shapes 
    that relate to the filter shape in a specified way. In order to do this, the 
    field being queried must be of geo_shape type. The filter will use the same 
    PrefixTree configuration as defined for the field.</p>

    @name ejs.GeoShapeFilter
    @ejs filter
    @borrows ejs.FilterMixin.name as name
    @borrows ejs.FilterMixin.cache as cache
    @borrows ejs.FilterMixin.cacheKey as cacheKey
    @borrows ejs.FilterMixin._type as _type
    @borrows ejs.FilterMixin.toJSON as toJSON

    @desc
    A Filter to find documents with a geo_shapes matching a specific shape.

    */
  ejs.GeoShapeFilter = function (field) {

    var
      _common = ejs.FilterMixin('geo_shape'),
      filter = _common.toJSON();
    
    filter.geo_shape[field] = {};

    return extend(_common, {

      /**
            Sets the field to filter against.

            @member ejs.GeoShapeFilter
            @param {String} f A valid field name.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      field: function (f) {
        var oldValue = filter.geo_shape[field];
  
        if (f == null) {
          return field;
        }

        delete filter.geo_shape[field];
        field = f;
        filter.geo_shape[f] = oldValue;
  
        return this;
      },

      /**
            Sets the shape

            @member ejs.GeoShapeFilter
            @param {String} shape A valid <code>Shape</code> object.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      shape: function (shape) {
        if (shape == null) {
          return filter.geo_shape[field].shape;
        }

        if (filter.geo_shape[field].indexed_shape != null) {
          delete filter.geo_shape[field].indexed_shape;
        }
      
        filter.geo_shape[field].shape = shape.toJSON();
        return this;
      },

      /**
            Sets the indexed shape.  Use this if you already have shape definitions
            already indexed.

            @member ejs.GeoShapeFilter
            @param {String} indexedShape A valid <code>IndexedShape</code> object.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      indexedShape: function (indexedShape) {
        if (indexedShape == null) {
          return filter.geo_shape[field].indexed_shape;
        }

        if (filter.geo_shape[field].shape != null) {
          delete filter.geo_shape[field].shape;
        }
      
        filter.geo_shape[field].indexed_shape = indexedShape.toJSON();
        return this;
      },

      /**
            Sets the shape relation type.  A relationship between a Query Shape 
            and indexed Shapes that will be used to determine if a Document 
            should be matched or not.  Valid values are:  intersects, disjoint,
            and within.

            @member ejs.GeoShapeFilter
            @param {String} indexedShape A valid <code>IndexedShape</code> object.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      relation: function (relation) {
        if (relation == null) {
          return filter.geo_shape[field].relation;
        }

        relation = relation.toLowerCase();
        if (relation === 'intersects' || relation === 'disjoint' || relation === 'within') {
          filter.geo_shape[field].relation = relation;
        }
    
        return this;
      },

      /**
            <p>Sets the spatial strategy.</p>  
            <p>Valid values are:</p>
            
            <dl>
                <dd><code>recursive</code> - default, recursively traverse nodes in
                  the spatial prefix tree.  This strategy has support for 
                  searching non-point shapes.</dd>
                <dd><code>term</code> - uses a large TermsFilter on each node
                  in the spatial prefix tree.  It only supports the search of 
                  indexed Point shapes.</dd>
            </dl>

            <p>This is an advanced setting, use with care.</p>
            
            @since elasticsearch 0.90
            @member ejs.GeoShapeFilter
            @param {String} strategy The strategy as a string.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      strategy: function (strategy) {
        if (strategy == null) {
          return filter.geo_shape[field].strategy;
        }

        strategy = strategy.toLowerCase();
        if (strategy === 'recursive' || strategy === 'term') {
          filter.geo_shape[field].strategy = strategy;
        }
        
        return this;
      }
      
    });
  };

  /**
    @class
    <p>The has_child filter results in parent documents that have child docs 
    matching the query being returned.</p>

    @name ejs.HasChildFilter
    @ejs filter
    @borrows ejs.FilterMixin.name as name
    @borrows ejs.FilterMixin.cache as cache
    @borrows ejs.FilterMixin.cacheKey as cacheKey
    @borrows ejs.FilterMixin._type as _type
    @borrows ejs.FilterMixin.toJSON as toJSON

    @desc
    Returns results that have child documents matching the filter.

    @param {Object} qry A valid query object.
    @param {String} type The child type
    */
  ejs.HasChildFilter = function (qry, type) {

    if (!isQuery(qry)) {
      throw new TypeError('No Query object found');
    }
    
    var 
      _common = ejs.FilterMixin('has_child'),
      filter = _common.toJSON();
    
    filter.has_child.query = qry.toJSON();
    filter.has_child.type = type;

    return extend(_common, {

      /**
            Sets the query

            @member ejs.HasChildFilter
            @param {Query} q A valid Query object
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      query: function (q) {
        if (q == null) {
          return filter.has_child.query;
        }
  
        if (!isQuery(q)) {
          throw new TypeError('Argument must be a Query object');
        }
        
        filter.has_child.query = q.toJSON();
        return this;
      },

      /**
            Sets the filter

            @since elasticsearch 0.90
            @member ejs.HasChildFilter
            @param {Query} f A valid Filter object
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      filter: function (f) {
        if (f == null) {
          return filter.has_child.filter;
        }
  
        if (!isFilter(f)) {
          throw new TypeError('Argument must be a Filter object');
        }
        
        filter.has_child.filter = f.toJSON();
        return this;
      },

      /**
            Sets the child document type to search against

            @member ejs.HasChildFilter
            @param {String} t A valid type name
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      type: function (t) {
        if (t == null) {
          return filter.has_child.type;
        }
  
        filter.has_child.type = t;
        return this;
      },

      /**
            Sets the cutoff value to short circuit processing.

            @member ejs.HasChildFilter
            @param {Integer} cutoff A positive <code>integer</code> value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      shortCircuitCutoff: function (cutoff) {
        if (cutoff == null) {
          return filter.has_child.short_circuit_cutoff;
        }

        filter.has_child.short_circuit_cutoff = cutoff;
        return this;
      },
      
      /**
            Sets the scope of the filter.  A scope allows to run facets on the 
            same scope name that will work against the child documents. 

            @deprecated since elasticsearch 0.90
            @member ejs.HasChildFilter
            @param {String} s The scope name as a string.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      scope: function (s) {
        return this;
      }
      
    });
  };

  /**
    @class
    <p>The has_parent results in child documents that have parent docs matching 
    the query being returned.</p>

    @name ejs.HasParentFilter
    @ejs filter
    @borrows ejs.FilterMixin.name as name
    @borrows ejs.FilterMixin.cache as cache
    @borrows ejs.FilterMixin.cacheKey as cacheKey
    @borrows ejs.FilterMixin._type as _type
    @borrows ejs.FilterMixin.toJSON as toJSON

    @desc
    Returns results that have parent documents matching the filter.

    @param {Object} qry A valid query object.
    @param {String} parentType The child type
    */
  ejs.HasParentFilter = function (qry, parentType) {

    if (!isQuery(qry)) {
      throw new TypeError('No Query object found');
    }
    
    var 
      _common = ejs.FilterMixin('has_parent'),
      filter = _common.toJSON();
    
    filter.has_parent.query = qry.toJSON();
    filter.has_parent.parent_type = parentType;

    return extend(_common, {

      /**
            Sets the query

            @member ejs.HasParentFilter
            @param {Object} q A valid Query object
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      query: function (q) {
        if (q == null) {
          return filter.has_parent.query;
        }

        if (!isQuery(q)) {
          throw new TypeError('Argument must be a Query object');
        }
        
        filter.has_parent.query = q.toJSON();
        return this;
      },
      
      /**
            Sets the filter

            @since elasticsearch 0.90
            @member ejs.HasParentFilter
            @param {Object} f A valid Filter object
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      filter: function (f) {
        if (f == null) {
          return filter.has_parent.filter;
        }

        if (!isFilter(f)) {
          throw new TypeError('Argument must be a Filter object');
        }
        
        filter.has_parent.filter = f.toJSON();
        return this;
      },

      /**
            Sets the child document type to search against

            @member ejs.HasParentFilter
            @param {String} t A valid type name
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      parentType: function (t) {
        if (t == null) {
          return filter.has_parent.parent_type;
        }

        filter.has_parent.parent_type = t;
        return this;
      },

      /**
            Sets the scope of the filter.  A scope allows to run facets on the 
            same scope name that will work against the parent documents. 

            @deprecated since elasticsearch 0.90
            @member ejs.HasParentFilter
            @param {String} s The scope name as a string.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      scope: function (s) {
        return this;
      }
      
    });
  };

  /**
    @class
    <p>Filters documents that only have the provided ids. Note, this filter 
    does not require the _id field to be indexed since it works using the 
    _uid field.</p>

    @name ejs.IdsFilter
    @ejs filter
    @borrows ejs.FilterMixin.name as name
    @borrows ejs.FilterMixin.cache as cache
    @borrows ejs.FilterMixin.cacheKey as cacheKey
    @borrows ejs.FilterMixin._type as _type
    @borrows ejs.FilterMixin.toJSON as toJSON

    @desc
    Matches documents with the specified id(s).

    @param {(String|String[])} ids A single document id or a list of document ids.
    */
  ejs.IdsFilter = function (ids) {

    var
      _common = ejs.FilterMixin('ids'),
      filter = _common.toJSON(); 
  
    if (isString(ids)) {
      filter.ids.values = [ids];
    } else if (isArray(ids)) {
      filter.ids.values = ids;
    } else {
      throw new TypeError('Argument must be a string or an array');
    }

    return extend(_common, {

      /**
            Sets the values array or adds a new value. if val is a string, it
            is added to the list of existing document ids.  If val is an
            array it is set as the document values and replaces any existing values.

            @member ejs.IdsFilter
            @param {(String|String[])} val An single document id or an array of document ids.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      values: function (val) {
        if (val == null) {
          return filter.ids.values;
        }
  
        if (isString(val)) {
          filter.ids.values.push(val);
        } else if (isArray(val)) {
          filter.ids.values = val;
        } else {
          throw new TypeError('Argument must be a string or an array');
        }
      
        return this;
      },

      /**
            Sets the type as a single type or an array of types.  If type is a
            string, it is added to the list of existing types.  If type is an
            array, it is set as the types and overwrites an existing types. This
            parameter is optional.

            @member ejs.IdsFilter
            @param {(String|String[])} type A type or a list of types
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      type: function (type) {
        if (filter.ids.type == null) {
          filter.ids.type = [];
        }
      
        if (type == null) {
          return filter.ids.type;
        }
      
        if (isString(type)) {
          filter.ids.type.push(type);
        } else if (isArray(type)) {
          filter.ids.type = type;
        } else {
          throw new TypeError('Argument must be a string or an array');
        }
      
        return this;
      }
      
    });
  };

  /**
    @class
    <p>The indices filter can be used when executed across multiple indices, 
    allowing to have a filter that executes only when executed on an index that 
    matches a specific list of indices, and another filter that executes when it 
    is executed on an index that does not match the listed indices.</p>

    @name ejs.IndicesFilter
    @ejs filter
    @borrows ejs.FilterMixin.name as name
    @borrows ejs.FilterMixin.cache as cache
    @borrows ejs.FilterMixin.cacheKey as cacheKey
    @borrows ejs.FilterMixin._type as _type
    @borrows ejs.FilterMixin.toJSON as toJSON

    @desc
    A configurable filter that is dependent on the index name.

    @param {Object} fltr A valid filter object.
    @param {(String|String[])} indices a single index name or an array of index 
      names.
    */
  ejs.IndicesFilter = function (fltr, indices) {

    if (!isFilter(fltr)) {
      throw new TypeError('Argument must be a Filter');
    }
  
    var 
      _common = ejs.FilterMixin('indices'),
      filter = _common.toJSON();
    
    filter.indices.filter = fltr.toJSON();

    if (isString(indices)) {
      filter.indices.indices = [indices];
    } else if (isArray(indices)) {
      filter.indices.indices = indices;
    } else {
      throw new TypeError('Argument must be a string or array');
    }

    return extend(_common, {

      /**
            Sets the indicies the filter should match.  When passed a string,
            the index name is added to the current list of indices.  When passed
            an array, it overwites all current indices.

            @member ejs.IndicesFilter
            @param {(String|String[])} i A single index name or an array of index names.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      indices: function (i) {
        if (i == null) {
          return filter.indices.indices;
        }

        if (isString(i)) {
          filter.indices.indices.push(i);
        } else if (isArray(i)) {
          filter.indices.indices = i;
        } else {
          throw new TypeError('Argument must be a string or array');
        }

        return this;
      },
  
      /**
            Sets the filter to be used when executing on one of the indicies 
            specified.

            @member ejs.IndicesFilter
            @param {Object} f A valid Filter object
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      filter: function (f) {
        if (f == null) {
          return filter.indices.filter;
        }

        if (!isFilter(f)) {
          throw new TypeError('Argument must be a Filter');
        }
      
        filter.indices.filter = f.toJSON();
        return this;
      },

      /**
            Sets the filter to be used on an index that does not match an index
            name in the indices list.  Can also be set to "none" to not match any
            documents or "all" to match all documents.

            @member ejs.IndicesFilter
            @param {(Filter|String)} f A valid Filter object or "none" or "all"
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      noMatchFilter: function (f) {
        if (f == null) {
          return filter.indices.no_match_filter;
        }

        if (isString(f)) {
          f = f.toLowerCase();
          if (f === 'none' || f === 'all') {
            filter.indices.no_match_filter = f;
          }
        } else if (isFilter(f)) {
          filter.indices.no_match_filter = f.toJSON();
        } else {
          throw new TypeError('Argument must be string or Filter');
        }
    
        return this;
      }
      
    });
  };

  /**
    @class
    <p>A limit filter limits the number of documents (per shard) to execute on.</p>

    @name ejs.LimitFilter
    @ejs filter
    @borrows ejs.FilterMixin.name as name
    @borrows ejs.FilterMixin.cache as cache
    @borrows ejs.FilterMixin.cacheKey as cacheKey
    @borrows ejs.FilterMixin._type as _type
    @borrows ejs.FilterMixin.toJSON as toJSON

    @desc
    Limits the number of documents to execute on.

    @param {Integer} limit The number of documents to execute on.
    */
  ejs.LimitFilter = function (limit) {

    var 
      _common = ejs.FilterMixin('limit'),
      filter = _common.toJSON();
    
    filter.limit.value = limit;

    return extend(_common, {

      /**
            Sets the limit value.

            @member ejs.LimitFilter
            @param {Integer} val An The number of documents to execute on.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      value: function (val) {
        if (val == null) {
          return filter.limit.value;
        }

        if (!isNumber(val)) {
          throw new TypeError('Argument must be a numeric value');
        }
            
        filter.limit.value = val;
        return this;
      }
      
    });
  };

  /**
    @class
    <p>This filter can be used to match on all the documents
    in a given set of collections and/or types.</p>

    @name ejs.MatchAllFilter
    @ejs filter
    @borrows ejs.FilterMixin.name as name
    @borrows ejs.FilterMixin.cache as cache
    @borrows ejs.FilterMixin.cacheKey as cacheKey
    @borrows ejs.FilterMixin._type as _type
    @borrows ejs.FilterMixin.toJSON as toJSON

    @desc
    <p>A filter that matches on all documents</p>

     */
  ejs.MatchAllFilter = function () {
    return ejs.FilterMixin('match_all');
  };

  /**
    @class
    <p>An missingFilter matches documents where the specified field contains no legitimate value.</p>

    @name ejs.MissingFilter
    @ejs filter
    @borrows ejs.FilterMixin.name as name
    @borrows ejs.FilterMixin.cache as cache
    @borrows ejs.FilterMixin.cacheKey as cacheKey
    @borrows ejs.FilterMixin._type as _type
    @borrows ejs.FilterMixin.toJSON as toJSON

    @desc
    Filters documents where a specific field has no value present.

    @param {String} fieldName the field name to check for missing values.
    */
  ejs.MissingFilter = function (fieldName) {

    
    var 
      _common = ejs.FilterMixin('missing'),
      filter = _common.toJSON();
    
    filter.missing.field = fieldName;

    return extend(_common, {

      /**
            Sets the field to check for missing values.

            @member ejs.MissingFilter
            @param {String} name A name of the field.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      field: function (name) {
        if (name == null) {
          return filter.missing.field;
        }

        filter.missing.field = name;
        return this;
      },
      
      /**
            Checks if the field doesn't exist.

            @member ejs.MissingFilter
            @param {Boolean} trueFalse True to check if the field doesn't exist.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      existence: function (trueFalse) {
        if (trueFalse == null) {
          return filter.missing.existence;
        }

        filter.missing.existence = trueFalse;
        return this;
      },

      /**
            Checks if the field has null values.

            @member ejs.MissingFilter
            @param {Boolean} trueFalse True to check if the field has nulls.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      nullValue: function (trueFalse) {
        if (trueFalse == null) {
          return filter.missing.null_value;
        }

        filter.missing.null_value = trueFalse;
        return this;
      }
      
    });
  };

  /**
    @class
    <p>Nested filters allow you to search against content within objects that are
       embedded inside of other objects. It is similar to <code>XPath</code> 
       expressions in <code>XML</code> both conceptually and syntactically.</p>

    <p>
    The filter is executed against the nested objects / docs as if they were 
    indexed as separate docs and resulting in the root 
    parent doc (or parent nested mapping).</p>
  
    @name ejs.NestedFilter
    @ejs filter
    @borrows ejs.FilterMixin.name as name
    @borrows ejs.FilterMixin.cache as cache
    @borrows ejs.FilterMixin.cacheKey as cacheKey
    @borrows ejs.FilterMixin._type as _type
    @borrows ejs.FilterMixin.toJSON as toJSON

    @desc
    <p>Constructs a filter that is capable of executing a filter against objects
       nested within a document.</p>

    @param {String} path The nested object path.

     */
  ejs.NestedFilter = function (path) {

    var 
      _common = ejs.FilterMixin('nested'),
      filter = _common.toJSON();
    
    filter.nested.path = path;

    return extend(_common, {
    
      /**
             Sets the root context for the nested filter.
             @member ejs.NestedFilter
             @param {String} p The path defining the root for the nested filter.
             @returns {Object} returns <code>this</code> so that calls can be chained.
             */
      path: function (p) {
        if (p == null) {
          return filter.nested.path;
        }
    
        filter.nested.path = p;
        return this;
      },

      /**
             Sets the nested query to be executed.
             @member ejs.NestedFilter
             @param {Query} oQuery A valid Query object
             @returns {Object} returns <code>this</code> so that calls can be chained.
             */
      query: function (oQuery) {
        if (oQuery == null) {
          return filter.nested.query;
        }
    
        if (!isQuery(oQuery)) {
          throw new TypeError('Argument must be a Query object');
        }
        
        filter.nested.query = oQuery.toJSON();
        return this;
      },


      /**
             Sets the nested filter to be executed.
             @member ejs.NestedFilter
             @param {Object} oFilter A valid Filter object
             @returns {Object} returns <code>this</code> so that calls can be chained.
             */
      filter: function (oFilter) {
        if (oFilter == null) {
          return filter.nested.filter;
        }
    
        if (!isFilter(oFilter)) {
          throw new TypeError('Argument must be a Filter object');
        }
        
        filter.nested.filter = oFilter.toJSON();
        return this;
      },

      /**
            Sets the boost value of the nested <code>Query</code>.

            @member ejs.NestedFilter
            @param {Double} boost A positive <code>double</code> value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      boost: function (boost) {
        if (boost == null) {
          return filter.nested.boost;
        }

        filter.nested.boost = boost;
        return this;
      },
    
      /**
            If the nested query should be "joined" with the parent document.
            Defaults to false.

            @member ejs.NestedFilter
            @param {Boolean} trueFalse If the query should be joined or not.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      join: function (trueFalse) {
        if (trueFalse == null) {
          return filter.nested.join;
        }

        filter.nested.join = trueFalse;
        return this;
      },
    
      /**
            Sets the scope of the filter.  A scope allows to run facets on the 
            same scope name that will work against the nested documents. 

            @deprecated since elasticsearch 0.90
            @member ejs.NestedFilter
            @param {String} s The scope name as a string.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      scope: function (s) {
        return this;
      }
      
    });
  };

  /**
    @class
    <p>A container Filter that excludes the documents matched by the
    contained filter.</p>

    @name ejs.NotFilter
    @ejs filter
    @borrows ejs.FilterMixin.name as name
    @borrows ejs.FilterMixin.cache as cache
    @borrows ejs.FilterMixin.cacheKey as cacheKey
    @borrows ejs.FilterMixin._type as _type
    @borrows ejs.FilterMixin.toJSON as toJSON

    @desc
    Container filter that excludes the matched documents of the contained filter.

    @param {Object} oFilter a valid Filter object such as a termFilter, etc.
    */
  ejs.NotFilter = function (oFilter) {

    if (!isFilter(oFilter)) {
      throw new TypeError('Argument must be a Filter');
    }
    
    var 
      _common = ejs.FilterMixin('not'),
      filter = _common.toJSON();
    
    filter.not = oFilter.toJSON();

    return extend(_common, {

      /**
             Sets the filter

             @member ejs.NotFilter
             @param {Object} fltr A valid filter object such as a termFilter, etc.
             @returns {Object} returns <code>this</code> so that calls can be chained.
             */
      filter: function (fltr) {
        if (fltr == null) {
          return filter.not;
        }
      
        if (!isFilter(fltr)) {
          throw new TypeError('Argument must be a Filter');
        }
        
        filter.not = fltr.toJSON();
        return this;
      }
      
    });
  };

  /**
    @class
    <p>Filters documents with fields that have values within a certain numeric 
    range. Similar to range filter, except that it works only with numeric 
    values, and the filter execution works differently.</p>
    
    <p>The numeric range filter works by loading all the relevant field values 
    into memory, and checking for the relevant docs if they satisfy the range 
    requirements. This requires more memory since the numeric range data are 
    loaded to memory, but can provide a significant increase in performance.</p> 
    
    <p>Note, if the relevant field values have already been loaded to memory, 
    for example because it was used in facets or was sorted on, then this 
    filter should be used.</p>

    @name ejs.NumericRangeFilter
    @ejs filter
    @borrows ejs.FilterMixin.name as name
    @borrows ejs.FilterMixin.cache as cache
    @borrows ejs.FilterMixin.cacheKey as cacheKey
    @borrows ejs.FilterMixin._type as _type
    @borrows ejs.FilterMixin.toJSON as toJSON

    @desc
    A Filter that only accepts numeric values within a specified range.

    @param {String} fieldName The name of the field to filter on.
    */
  ejs.NumericRangeFilter = function (fieldName) {

    var
      _common = ejs.FilterMixin('numeric_range'),
      filter = _common.toJSON();

    filter.numeric_range[fieldName] = {};

    return extend(_common, {

      /**
             Returns the field name used to create this object.

             @member ejs.NumericRangeFilter
             @param {String} field the field name
             @returns {Object} returns <code>this</code> so that calls can be 
              chained. Returns {String}, field name when field is not specified.
             */
      field: function (field) {
        var oldValue = filter.numeric_range[fieldName];
      
        if (field == null) {
          return fieldName;
        }
      
        delete filter.numeric_range[fieldName];
        fieldName = field;
        filter.numeric_range[fieldName] = oldValue;
      
        return this;
      },
      
      /**
             Sets the endpoint for the current range.

             @member ejs.NumericRangeFilter
             @param {Number} startPoint A numeric value representing the start of the range
             @returns {Object} returns <code>this</code> so that calls can be chained.
             */
      from: function (from) {
        if (from == null) {
          return filter.numeric_range[fieldName].from;
        }
        
        if (!isNumber(from)) {
          throw new TypeError('Argument must be a numeric value');
        }
        
        filter.numeric_range[fieldName].from = from;
        return this;
      },

      /**
             Sets the endpoint for the current range.

             @member ejs.NumericRangeFilter
             @param {Number} endPoint A numeric value representing the end of the range
             @returns {Object} returns <code>this</code> so that calls can be chained.
             */
      to: function (to) {
        if (to == null) {
          return filter.numeric_range[fieldName].to;
        }

        if (!isNumber(to)) {
          throw new TypeError('Argument must be a numeric value');
        }
        
        filter.numeric_range[fieldName].to = to;
        return this;
      },

      /**
            Should the first from (if set) be inclusive or not. 
            Defaults to true

            @member ejs.NumericRangeFilter
            @param {Boolean} trueFalse true to include, false to exclude 
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      includeLower: function (trueFalse) {
        if (trueFalse == null) {
          return filter.numeric_range[fieldName].include_lower;
        }

        filter.numeric_range[fieldName].include_lower = trueFalse;
        return this;
      },

      /**
            Should the last to (if set) be inclusive or not. Defaults to true.

            @member ejs.NumericRangeFilter
            @param {Boolean} trueFalse true to include, false to exclude 
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      includeUpper: function (trueFalse) {
        if (trueFalse == null) {
          return filter.numeric_range[fieldName].include_upper;
        }

        filter.numeric_range[fieldName].include_upper = trueFalse;
        return this;
      },

      /**
            Greater than value.  Same as setting from to the value, and 
            include_lower to false,

            @member ejs.NumericRangeFilter
            @param {*} val the value, type depends on field type
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      gt: function (val) {
        if (val == null) {
          return filter.numeric_range[fieldName].gt;
        }

        if (!isNumber(val)) {
          throw new TypeError('Argument must be a numeric value');
        }
        
        filter.numeric_range[fieldName].gt = val;
        return this;
      },

      /**
            Greater than or equal to value.  Same as setting from to the value,
            and include_lower to true.

            @member ejs.NumericRangeFilter
            @param {*} val the value, type depends on field type
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      gte: function (val) {
        if (val == null) {
          return filter.numeric_range[fieldName].gte;
        }

        if (!isNumber(val)) {
          throw new TypeError('Argument must be a numeric value');
        }
        
        filter.numeric_range[fieldName].gte = val;
        return this;
      },

      /**
            Less than value.  Same as setting to to the value, and include_upper 
            to false.

            @member ejs.NumericRangeFilter
            @param {*} val the value, type depends on field type
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      lt: function (val) {
        if (val == null) {
          return filter.numeric_range[fieldName].lt;
        }

        if (!isNumber(val)) {
          throw new TypeError('Argument must be a numeric value');
        }
        
        filter.numeric_range[fieldName].lt = val;
        return this;
      },

      /**
            Less than or equal to value.  Same as setting to to the value, 
            and include_upper to true.

            @member ejs.NumericRangeFilter
            @param {*} val the value, type depends on field type
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      lte: function (val) {
        if (val == null) {
          return filter.numeric_range[fieldName].lte;
        }

        if (!isNumber(val)) {
          throw new TypeError('Argument must be a numeric value');
        }
        
        filter.numeric_range[fieldName].lte = val;
        return this;
      }
      
    });
  };

  /**
    @class
    A container filter that allows Boolean OR composition of filters.

    @name ejs.OrFilter
    @ejs filter
    @borrows ejs.FilterMixin.name as name
    @borrows ejs.FilterMixin.cache as cache
    @borrows ejs.FilterMixin.cacheKey as cacheKey
    @borrows ejs.FilterMixin._type as _type
    @borrows ejs.FilterMixin.toJSON as toJSON

    @desc
    A container Filter that allows Boolean OR composition of filters.

    @param {(Filter|Filter[])} filters A valid Filter or array of Filters.
    */
  ejs.OrFilter = function (filters) {

    var
      i, 
      len,
      _common = ejs.FilterMixin('or'),
      filter = _common.toJSON();

    filter.or.filters = [];

    if (isFilter(filters)) {
      filter.or.filters.push(filters.toJSON());
    } else if (isArray(filters)) {
      for (i = 0, len = filters.length; i < len; i++) {
        if (!isFilter(filters[i])) {
          throw new TypeError('Argument must be array of Filters');
        }
        
        filter.or.filters.push(filters[i].toJSON());
      }
    } else {
      throw new TypeError('Argument must be a Filter or array of Filters');
    }

    return extend(_common, {

      /**
             Updates the filters.  If passed a single Filter it is added to 
             the existing filters.  If passed an array of Filters, they 
             replace all existing Filters.

             @member ejs.OrFilter
             @param {(Filter|Filter[])} fltr A Filter or array of Filters
             @returns {Object} returns <code>this</code> so that calls can be chained.
             */
      filters: function (fltr) {
        var i, len;
        
        if (fltr == null) {
          return filter.or.filters;
        }
      
        if (isFilter(fltr)) {
          filter.or.filters.push(fltr.toJSON());
        } else if (isArray(fltr)) {
          filter.or.filters = [];
          for (i = 0, len = fltr.length; i < len; i++) {
            if (!isFilter(fltr[i])) {
              throw new TypeError('Argument must be an array of Filters');
            }
            
            filter.or.filters.push(fltr[i].toJSON());
          }
        } else {
          throw new TypeError('Argument must be a Filter or array of Filters');
        }
        
        return this;
      }
      
    });
  };

  /**
    @class
    <p>Filters documents that have fields containing terms with a specified prefix (not analyzed). Similar
    to phrase query, except that it acts as a filter. Can be placed within queries that accept a filter.</p>

    @name ejs.PrefixFilter
    @ejs filter
    @borrows ejs.FilterMixin.name as name
    @borrows ejs.FilterMixin.cache as cache
    @borrows ejs.FilterMixin.cacheKey as cacheKey
    @borrows ejs.FilterMixin._type as _type
    @borrows ejs.FilterMixin.toJSON as toJSON

    @desc
    Filters documents that have fields containing terms with a specified prefix.

    @param {String} fieldName the field name to be used during matching.
    @param {String} prefix the prefix value.
    */
  ejs.PrefixFilter = function (fieldName, prefix) {

    var
      _common = ejs.FilterMixin('prefix'),
      filter = _common.toJSON();

    filter.prefix[fieldName] = prefix;
    
    return extend(_common, {

      /**
             Returns the field name used to create this object.

             @member ejs.PrefixFilter
             @param {String} field the field name
             @returns {Object} returns <code>this</code> so that calls can be 
              chained. Returns {String}, field name when field is not specified.
             */
      field: function (field) {
        var oldValue = filter.prefix[fieldName];
      
        if (field == null) {
          return fieldName;
        }
      
        delete filter.prefix[fieldName];
        fieldName = field;
        filter.prefix[fieldName] = oldValue;
      
        return this;
      },
      
      /**
             Sets the prefix to search for.

             @member ejs.PrefixFilter
             @param {String} value the prefix value to match
             @returns {Object} returns <code>this</code> so that calls can be chained.
             */
      prefix: function (value) {
        if (value == null) {
          return filter.prefix[fieldName];
        }
      
        filter.prefix[fieldName] = value;
        return this;
      }
      
    });
  };

  /**
    @class
    <p>Wraps any query to be used as a filter. Can be placed within queries 
    that accept a filter.</p>

    <p>The result of the filter is not cached by default.  Set the cache 
    parameter to true to cache the result of the filter. This is handy when the 
    same query is used on several (many) other queries.</p> 
  
    <p>Note, the process of caching the first execution is higher when not 
    caching (since it needs to satisfy different queries).</p>
  
    @name ejs.QueryFilter
    @ejs filter
    @borrows ejs.FilterMixin.name as name
    @borrows ejs.FilterMixin.cache as cache
    @borrows ejs.FilterMixin.cacheKey as cacheKey
    @borrows ejs.FilterMixin._type as _type
    @borrows ejs.FilterMixin.toJSON as toJSON

    @desc
    Filters documents matching the wrapped query.

    @param {Object} qry A valid query object.
    */
  ejs.QueryFilter = function (qry) {

    if (!isQuery(qry)) {
      throw new TypeError('Argument must be a Query');
    }
    
    var
      _common = ejs.FilterMixin('fquery'),
      filter = _common.toJSON();
    
    filter.fquery.query = qry.toJSON();

    return extend(_common, {

      /**
            Sets the query

            @member ejs.QueryFilter
            @param {Object} q A valid Query object
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      query: function (q) {
        if (q == null) {
          return filter.fquery.query;
        }

        if (!isQuery(q)) {
          throw new TypeError('Argument must be a Query');
        }
        
        filter.fquery.query = q.toJSON();
        return this;
      }
      
    });
  };

  /**
    @class
    <p>Matches documents with fields that have terms within a certain range.</p>

    @name ejs.RangeFilter
    @ejs filter
    @borrows ejs.FilterMixin.name as name
    @borrows ejs.FilterMixin.cache as cache
    @borrows ejs.FilterMixin.cacheKey as cacheKey
    @borrows ejs.FilterMixin._type as _type
    @borrows ejs.FilterMixin.toJSON as toJSON

    @desc
    Filters documents with fields that have terms within a certain range.

    @param {String} field A valid field name.
    */
  ejs.RangeFilter = function (field) {

    var
      _common = ejs.FilterMixin('range'),
      filter = _common.toJSON();

    filter.range[field] = {};

    return extend(_common, {

      /**
             The field to run the filter against.

             @member ejs.RangeFilter
             @param {String} f A single field name.
             @returns {Object} returns <code>this</code> so that calls can be chained.
             */
      field: function (f) {
        var oldValue = filter.range[field];

        if (f == null) {
          return field;
        }

        delete filter.range[field];
        field = f;
        filter.range[f] = oldValue;

        return this;
      },

      /**
            The lower bound. Defaults to start from the first.

            @member ejs.RangeFilter
            @param {*} f the lower bound value, type depends on field type
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      from: function (f) {
        if (f == null) {
          return filter.range[field].from;
        }

        filter.range[field].from = f;
        return this;
      },

      /**
            The upper bound. Defaults to unbounded.

            @member ejs.RangeFilter
            @param {*} t the upper bound value, type depends on field type
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      to: function (t) {
        if (t == null) {
          return filter.range[field].to;
        }

        filter.range[field].to = t;
        return this;
      },

      /**
            Should the first from (if set) be inclusive or not. 
            Defaults to true

            @member ejs.RangeFilter
            @param {Boolean} trueFalse true to include, false to exclude 
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      includeLower: function (trueFalse) {
        if (trueFalse == null) {
          return filter.range[field].include_lower;
        }

        filter.range[field].include_lower = trueFalse;
        return this;
      },

      /**
            Should the last to (if set) be inclusive or not. Defaults to true.

            @member ejs.RangeFilter
            @param {Boolean} trueFalse true to include, false to exclude 
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      includeUpper: function (trueFalse) {
        if (trueFalse == null) {
          return filter.range[field].include_upper;
        }

        filter.range[field].include_upper = trueFalse;
        return this;
      },

      /**
            Greater than value.  Same as setting from to the value, and 
            include_lower to false,

            @member ejs.RangeFilter
            @param {*} val the value, type depends on field type
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      gt: function (val) {
        if (val == null) {
          return filter.range[field].gt;
        }

        filter.range[field].gt = val;
        return this;
      },

      /**
            Greater than or equal to value.  Same as setting from to the value,
            and include_lower to true.

            @member ejs.RangeFilter
            @param {*} val the value, type depends on field type
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      gte: function (val) {
        if (val == null) {
          return filter.range[field].gte;
        }

        filter.range[field].gte = val;
        return this;
      },

      /**
            Less than value.  Same as setting to to the value, and include_upper 
            to false.

            @member ejs.RangeFilter
            @param {*} val the value, type depends on field type
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      lt: function (val) {
        if (val == null) {
          return filter.range[field].lt;
        }

        filter.range[field].lt = val;
        return this;
      },

      /**
            Less than or equal to value.  Same as setting to to the value, 
            and include_upper to true.

            @member ejs.RangeFilter
            @param {*} val the value, type depends on field type
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      lte: function (val) {
        if (val == null) {
          return filter.range[field].lte;
        }

        filter.range[field].lte = val;
        return this;
      }
      
    });
  };

  /**
    @class
    <p>Filters documents that have a field value matching a regular expression. 
    Based on Lucene 4.0 RegexpFilter which uses automaton to efficiently iterate 
    over index terms.</p>

    @name ejs.RegexpFilter
    @ejs filter
    @borrows ejs.FilterMixin.name as name
    @borrows ejs.FilterMixin.cache as cache
    @borrows ejs.FilterMixin.cacheKey as cacheKey
    @borrows ejs.FilterMixin._type as _type
    @borrows ejs.FilterMixin.toJSON as toJSON

    @desc
    Matches documents that have fields matching a regular expression.

    @param {String} field A valid field name.
    @param {String} value A regex pattern.
    */
  ejs.RegexpFilter = function (field, value) {

    var
    _common = ejs.FilterMixin('regexp'),
    filter = _common.toJSON();

    filter.regexp[field] = {
      value: value
    };

    return extend(_common, {

      /**
             The field to run the filter against.

             @member ejs.RegexpFilter
             @param {String} f A single field name.
             @returns {Object} returns <code>this</code> so that calls can be chained.
             */
      field: function (f) {
        var oldValue = filter.regexp[field];

        if (f == null) {
          return field;
        }

        delete filter.regexp[field];
        field = f;
        filter.regexp[f] = oldValue;

        return this;
      },

      /**
            The regexp value.

            @member ejs.RegexpFilter
            @param {String} p A string regexp
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      value: function (p) {
        if (p == null) {
          return filter.regexp[field].value;
        }

        filter.regexp[field].value = p;
        return this;
      },

      /**
            The regex flags to use.  Valid flags are:
        
            INTERSECTION - Support for intersection notation
            COMPLEMENT - Support for complement notation
            EMPTY - Support for the empty language symbol: #
            ANYSTRING - Support for the any string symbol: @
            INTERVAL - Support for numerical interval notation: <n-m>
            NONE - Disable support for all syntax options
            ALL - Enables support for all syntax options
        
            Use multiple flags by separating with a "|" character.  Example:
        
            INTERSECTION|COMPLEMENT|EMPTY

            @member ejs.RegexpFilter
            @param {String} f The flags as a string, separate multiple flags with "|".
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      flags: function (f) {
        if (f == null) {
          return filter.regexp[field].flags;
        }

        filter.regexp[field].flags = f;
        return this;
      },
  
      /**
            The regex flags to use as a numeric value.  Advanced use only,
            it is probably better to stick with the <code>flags</code> option.
        
            @member ejs.RegexpFilter
            @param {String} v The flags as a numeric value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      flagsValue: function (v) {
        if (v == null) {
          return filter.regexp[field].flags_value;
        }

        filter.regexp[field].flags_value = v;
        return this;
      }
      
    });
  };

  /**
    @class
    <p>A filter allowing to define scripts as filters</p>

    @name ejs.ScriptFilter
    @ejs filter
    @borrows ejs.FilterMixin.name as name
    @borrows ejs.FilterMixin.cache as cache
    @borrows ejs.FilterMixin.cacheKey as cacheKey
    @borrows ejs.FilterMixin._type as _type
    @borrows ejs.FilterMixin.toJSON as toJSON

    @desc
    A filter allowing to define scripts as filters.

    @param {String} script The script as a string.
    */
  ejs.ScriptFilter = function (script) {

    var
      _common = ejs.FilterMixin('script'),
      filter = _common.toJSON();
    
    filter.script.script = script;

    return extend(_common, {

      /**
            Sets the script.

            @member ejs.ScriptFilter
            @param {String} s The script as a string.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      script: function (s) {
        if (s == null) {
          return filter.script.script;
        }
  
        filter.script.script = s;
        return this;
      },

      /**
            Sets parameters that will be applied to the script.  Overwrites 
            any existing params.

            @member ejs.ScriptFilter
            @param {Object} p An object where the keys are the parameter name and 
              values are the parameter value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      params: function (p) {
        if (p == null) {
          return filter.script.params;
        }
    
        filter.script.params = p;
        return this;
      },
    
      /**
            Sets the script language.

            @member ejs.ScriptFilter
            @param {String} lang The script language, default mvel.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      lang: function (lang) {
        if (lang == null) {
          return filter.script.lang;
        }
  
        filter.script.lang = lang;
        return this;
      }
      
    });
  };

  /**
    @class
    <p>Constructs a filter for docs matching any of the terms added to this
    object. Unlike a RangeFilter this can be used for filtering on multiple
    terms that are not necessarily in a sequence.</p>

    @name ejs.TermFilter
    @ejs filter
    @borrows ejs.FilterMixin.name as name
    @borrows ejs.FilterMixin.cache as cache
    @borrows ejs.FilterMixin.cacheKey as cacheKey
    @borrows ejs.FilterMixin._type as _type
    @borrows ejs.FilterMixin.toJSON as toJSON

    @desc
    Constructs a filter for docs matching the term added to this object.

    @param {string} fieldName The document field/fieldName to execute the filter against.
    @param {string} term The literal term used to filter the results.
    */
  ejs.TermFilter = function (fieldName, term) {

    var
      _common = ejs.FilterMixin('term'),
      filter = _common.toJSON();

    filter.term[fieldName] = term;

    return extend(_common, {

      /**
             Provides access to the filter fieldName used to construct the 
             termFilter object.
             
             @member ejs.TermFilter
             @param {String} f the fieldName term
             @returns {Object} returns <code>this</code> so that calls can be chained.
              When k is not specified, Returns {String}, the filter fieldName used to construct 
              the termFilter object.
             */
      field: function (f) {
        var oldValue = filter.term[fieldName];
      
        if (f == null) {
          return fieldName;
        }
      
        delete filter.term[fieldName];
        fieldName = f;
        filter.term[fieldName] = oldValue;
      
        return this;
      },

      /**
             Provides access to the filter term used to construct the 
             termFilter object.
             
             @member ejs.TermFilter
             @returns {Object} returns <code>this</code> so that calls can be chained.
              When k is not specified, Returns {String}, the filter term used 
              to construct the termFilter object.
             */
      term: function (v) {
        if (v == null) {
          return filter.term[fieldName];
        }
      
        filter.term[fieldName] = v;
        return this;
      }
      
    });
  };

  /**
    @class
    <p>Filters documents that have fields that match any of the provided 
    terms (not analyzed)</p>

    @name ejs.TermsFilter
    @ejs filter
    @borrows ejs.FilterMixin.name as name
    @borrows ejs.FilterMixin.cache as cache
    @borrows ejs.FilterMixin.cacheKey as cacheKey
    @borrows ejs.FilterMixin._type as _type
    @borrows ejs.FilterMixin.toJSON as toJSON

    @desc
    A Filter that matches documents containing provided terms. 

    @param {String} field the document field/key to filter against
    @param {(String|String[])} terms a single term or an array of terms.
    */
  ejs.TermsFilter = function (field, terms) {

    var
      _common = ejs.FilterMixin('terms'),
      filter = _common.toJSON(),
    
      // make sure we are setup for a list of terms
      setupTerms = function () {
        if (!isArray(filter.terms[field])) {
          filter.terms[field] = [];
        }
      },
    
      // make sure we are setup for a terms lookup
      setupLookup = function () {
        if (isArray(filter.terms[field])) {
          filter.terms[field] = {};
        }
      };
   
    if (isArray(terms)) {
      filter.terms[field] = terms;
    } else {
      filter.terms[field] = [terms];
    }

    return extend(_common, {

      /**
            Sets the fields to filter against.

            @member ejs.TermsFilter
            @param {String} f A valid field name.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      field: function (f) {
        var oldValue = filter.terms[field];
    
        if (f == null) {
          return field;
        }

        delete filter.terms[field];
        field = f;
        filter.terms[f] = oldValue;
    
        return this;
      },
  
      /**
            Sets the terms.  If t is a String, it is added to the existing
            list of terms.  If t is an array, the list of terms replaces the
            existing terms.

            @member ejs.TermsFilter
            @param {(String|String[])} t A single term or an array or terms.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      terms: function (t) {
        setupTerms();
        if (t == null) {
          return filter.terms[field];
        }
        
        if (isArray(t)) {
          filter.terms[field] = t;
        } else {
          filter.terms[field].push(t);
        }
    
        return this;
      },

      /**
            Sets the index the document containing the terms is in when 
            performing a terms lookup.  Defaults to the index currently 
            being searched.

            @since elasticsearch 0.90
            @member ejs.TermsFilter
            @param {String} idx A valid index name.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      index: function (idx) {
        setupLookup();
        if (idx == null) {
          return filter.terms[field].index;
        }
        
        filter.terms[field].index = idx;
        return this;
      },

      /**
            Sets the type the document containing the terms when performing a 
            terms lookup.

            @since elasticsearch 0.90
            @member ejs.TermsFilter
            @param {String} type A valid type name.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      type: function (type) {
        setupLookup();
        if (type == null) {
          return filter.terms[field].type;
        }
        
        filter.terms[field].type = type;
        return this;
      },


      /**
            Sets the document id of the document containing the terms to use
            when performing a terms lookup.

            @since elasticsearch 0.90
            @member ejs.TermsFilter
            @param {String} id A valid index name.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      id: function (id) {
        setupLookup();
        if (id == null) {
          return filter.terms[field].id;
        }
        
        filter.terms[field].id = id;
        return this;
      },
      
      /**
            Sets the path/field name where the terms in the source document
            are located when performing a terms lookup.

            @since elasticsearch 0.90
            @member ejs.TermsFilter
            @param {String} path A valid index name.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      path: function (path) {
        setupLookup();
        if (path == null) {
          return filter.terms[field].path;
        }
        
        filter.terms[field].path = path;
        return this;
      },
      
      /**
            Sets the routing value for the source document when performing a 
            terms lookup.

            @since elasticsearch 0.90.2
            @member ejs.TermsFilter
            @param {String} path A valid index name.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      routing: function (r) {
        setupLookup();
        if (r == null) {
          return filter.terms[field].routing;
        }
        
        filter.terms[field].routing = r;
        return this;
      },
      
      /**
            Enable or disable caching of the lookup

            @member ejs.TermsFilter
            @param {Boolean} trueFalse True to cache the lookup, false otherwise.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      cacheLookup: function (trueFalse) {
        setupLookup();
        if (trueFalse == null) {
          return filter.terms[field].cache;
        }

        filter.terms[field].cache = trueFalse;
        return this;
      },
      
      /**
            Sets the way terms filter executes is by iterating over the terms 
            provided and finding matches docs (loading into a bitset) and 
            caching it.  Valid values are: plain, bool, bool_nocache, and, 
            and_nocache, or, or_nocache.  Defaults to plain.

            @member ejs.TermsFilter
            @param {String} e A valid execution method.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      execution: function (e) {
        if (e == null) {
          return filter.terms.execution;
        }
      
        e = e.toLowerCase();
        if (e === 'plain' || e === 'bool' || e === 'bool_nocache' || 
          e === 'and' || e === 'and_nocache' || e === 'or' || e === 'or_nocache') {
          filter.terms.execution = e;
        }
      
        return this;
      }
      
    });
  };

  /**
    @class
    <p>A Filter that filters results by a specified index type.</p>

    @name ejs.TypeFilter
    @ejs filter
    @borrows ejs.FilterMixin.name as name
    @borrows ejs.FilterMixin.cache as cache
    @borrows ejs.FilterMixin.cacheKey as cacheKey
    @borrows ejs.FilterMixin._type as _type
    @borrows ejs.FilterMixin.toJSON as toJSON

    @desc
    Filter results by a specified index type.

    @param {String} type the index type to filter on.
    */
  ejs.TypeFilter = function (type) {

    var 
    _common = ejs.FilterMixin('type'),
    filter = _common.toJSON();
    
    filter.type.value = type;

    return extend(_common, {

      /**
             Sets the type

             @member ejs.TypeFilter
             @param {String} type the index type to filter on
             @returns {Object} returns <code>this</code> so that calls can be chained.
             */
      type: function (type) {
        if (type == null) {
          return filter.type.value;
        }
      
        filter.type.value = type;
        return this;
      }
      
    });
  };

  /**
    @class
    <p>A <code>boolQuery</code> allows you to build <em>Boolean</em> query constructs
    from individual term or phrase queries. For example you might want to search
    for documents containing the terms <code>javascript</code> and <code>python</code>.</p>

    @name ejs.BoolQuery
    @ejs query
    @borrows ejs.QueryMixin.boost as boost
    @borrows ejs.QueryMixin._type as _type
    @borrows ejs.QueryMixin.toJSON as toJSON

    @desc
    A Query that matches documents matching boolean combinations of other
    queries, e.g. <code>termQuerys, phraseQuerys</code> or other <code>boolQuerys</code>.

    */
  ejs.BoolQuery = function () {

    var
      _common = ejs.QueryMixin('bool'),
      query = _common.toJSON();

    return extend(_common, {

      /**
             Adds query to boolean container. Given query "must" appear in matching documents.

             @member ejs.BoolQuery
             @param {Object} oQuery A valid <code>Query</code> object
             @returns {Object} returns <code>this</code> so that calls can be chained.
             */
      must: function (oQuery) {
        var i, len;
        
        if (query.bool.must == null) {
          query.bool.must = [];
        }
    
        if (oQuery == null) {
          return query.bool.must;
        }

        if (isQuery(oQuery)) {
          query.bool.must.push(oQuery.toJSON());
        } else if (isArray(oQuery)) {
          query.bool.must = [];
          for (i = 0, len = oQuery.length; i < len; i++) {
            if (!isQuery(oQuery[i])) {
              throw new TypeError('Argument must be an array of Queries');
            }
            
            query.bool.must.push(oQuery[i].toJSON());
          }
        } else {
          throw new TypeError('Argument must be a Query or array of Queries');
        }
        
        return this;
      },

      /**
             Adds query to boolean container. Given query "must not" appear in matching documents.

             @member ejs.BoolQuery
             @param {Object} oQuery A valid query object
             @returns {Object} returns <code>this</code> so that calls can be chained.
             */
      mustNot: function (oQuery) {
        var i, len;
        
        if (query.bool.must_not == null) {
          query.bool.must_not = [];
        }

        if (oQuery == null) {
          return query.bool.must_not;
        }
    
        if (isQuery(oQuery)) {
          query.bool.must_not.push(oQuery.toJSON());
        } else if (isArray(oQuery)) {
          query.bool.must_not = [];
          for (i = 0, len = oQuery.length; i < len; i++) {
            if (!isQuery(oQuery[i])) {
              throw new TypeError('Argument must be an array of Queries');
            }
            
            query.bool.must_not.push(oQuery[i].toJSON());
          }
        } else {
          throw new TypeError('Argument must be a Query or array of Queries');
        }
        
        return this;
      },

      /**
             Adds query to boolean container. Given query "should" appear in matching documents.

             @member ejs.BoolQuery
             @param {Object} oQuery A valid query object
             @returns {Object} returns <code>this</code> so that calls can be chained.
             */
      should: function (oQuery) {
        var i, len;
        
        if (query.bool.should == null) {
          query.bool.should = [];
        }

        if (oQuery == null) {
          return query.bool.should;
        }
    
        if (isQuery(oQuery)) {
          query.bool.should.push(oQuery.toJSON());
        } else if (isArray(oQuery)) {
          query.bool.should = [];
          for (i = 0, len = oQuery.length; i < len; i++) {
            if (!isQuery(oQuery[i])) {
              throw new TypeError('Argument must be an array of Queries');
            }
            
            query.bool.should.push(oQuery[i].toJSON());
          }
        } else {
          throw new TypeError('Argument must be a Query or array of Queries');
        }
        
        return this;
      },

      /**
            Sets if the <code>Query</code> should be enhanced with a
            <code>MatchAllQuery</code> in order to act as a pure exclude when
            only negative (mustNot) clauses exist. Default: true.

            @member ejs.BoolQuery
            @param {String} trueFalse A <code>true/false</code value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      adjustPureNegative: function (trueFalse) {
        if (trueFalse == null) {
          return query.bool.adjust_pure_negative;
        }

        query.bool.adjust_pure_negative = trueFalse;
        return this;
      },
      
      /**
            Enables or disables similarity coordinate scoring of documents
            matching the <code>Query</code>. Default: false.

            @member ejs.BoolQuery
            @param {String} trueFalse A <code>true/false</code value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      disableCoord: function (trueFalse) {
        if (trueFalse == null) {
          return query.bool.disable_coord;
        }

        query.bool.disable_coord = trueFalse;
        return this;
      },

      /**
            <p>Sets the number of optional clauses that must match.</p>
      
            <p>By default no optional clauses are necessary for a match
            (unless there are no required clauses).  If this method is used,
            then the specified number of clauses is required.</p>

            <p>Use of this method is totally independent of specifying that
            any specific clauses are required (or prohibited).  This number will
            only be compared against the number of matching optional clauses.</p>
   
            @member ejs.BoolQuery
            @param {Integer} minMatch A positive <code>integer</code> value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      minimumNumberShouldMatch: function (minMatch) {
        if (minMatch == null) {
          return query.bool.minimum_number_should_match;
        }

        query.bool.minimum_number_should_match = minMatch;
        return this;
      }
      
    });
  };

  /**
    @class
    <p>The boosting query can be used to effectively demote results that match 
    a given query. Unlike the “NOT” clause in bool query, this still selects 
    documents that contain undesirable terms, but reduces their overall 
    score.</p>

    @name ejs.BoostingQuery
    @ejs query
    @borrows ejs.QueryMixin.boost as boost
    @borrows ejs.QueryMixin._type as _type
    @borrows ejs.QueryMixin.toJSON as toJSON

    @desc
    <p>Constructs a query that can demote search results.  A negative boost.</p>

    @param {Object} positiveQry Valid query object used to select all matching docs.
    @param {Object} negativeQry Valid query object to match the undesirable docs 
      returned within the positiveQry result set.
    @param {Double} negativeBoost A double value where 0 < n < 1.
     */
  ejs.BoostingQuery = function (positiveQry, negativeQry, negativeBoost) {

    if (!isQuery(positiveQry) || !isQuery(negativeQry)) {
      throw new TypeError('Arguments must be Queries');
    }
    
    var 
      _common = ejs.QueryMixin('boosting'),
      query = _common.toJSON();
    
    query.boosting.positive = positiveQry.toJSON();
    query.boosting.negative = negativeQry.toJSON();
    query.boosting.negative_boost = negativeBoost;

    return extend(_common, {
    
      /**
             Sets the "master" query that determines which results are returned.

             @member ejs.BoostingQuery
             @param {Object} oQuery A valid <code>Query</code> object
             @returns {Object} returns <code>this</code> so that calls can be 
              chained. Returns {Object} current positive query if oQuery is
              not specified.
             */
      positive: function (oQuery) {
        if (oQuery == null) {
          return query.boosting.positive;
        }
    
        if (!isQuery(oQuery)) {
          throw new TypeError('Argument must be a Query');
        }
        
        query.boosting.positive = oQuery.toJSON();
        return this;
      },

      /**
             Sets the query used to match documents in the <code>positive</code>
             query that will be negatively boosted.

             @member ejs.BoostingQuery
             @param {Object} oQuery A valid <code>Query</code> object
             @returns {Object} returns <code>this</code> so that calls can be 
              chained. Returns {Object} current negative query if oQuery is
              not specified.
             */
      negative: function (oQuery) {
        if (oQuery == null) {
          return query.boosting.negative;
        }
    
        if (!isQuery(oQuery)) {
          throw new TypeError('Argument must be a Query');
        }
        
        query.boosting.negative = oQuery.toJSON();
        return this;
      },
   
      /**
            Sets the negative boost value.

            @member ejs.BoostingQuery
            @param {Double} boost A positive <code>double</code> value where 0 < n < 1.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      negativeBoost: function (negBoost) {
        if (negBoost == null) {
          return query.boosting.negative_boost;
        }

        query.boosting.negative_boost = negBoost;
        return this;
      }
      
    });
  };

  /**
    @class
    <p>A query that executes high-frequency terms in a optional sub-query to 
    prevent slow queries due to "common" terms like stopwords.</p>
  
    <p>This query basically builds two queries out of the terms in the query 
    string where low-frequency terms are added to a required boolean clause and 
    high-frequency terms are added to an optional boolean clause. The optional 
    clause is only executed if the required "low-frequency' clause matches.</p>
  
    <p><code>CommonTermsQuery</code> has several advantages over stopword 
    filtering at index or query time since a term can be "classified" based on 
    the actual document frequency in the index and can prevent slow queries even 
    across domains without specialized stopword files.</p>
  
    @name ejs.CommonTermsQuery
    @ejs query
    @borrows ejs.QueryMixin._type as _type
    @borrows ejs.QueryMixin.toJSON as toJSON
  
    @desc
    A query that executes high-frequency terms in a optional sub-query.

    @param {String} field the document field/key to query against
    @param {String} qstr the query string
    */
  ejs.CommonTermsQuery = function (field, qstr) {

    var
      _common = ejs.QueryMixin('common'),
      query = _common.toJSON();
  
    // support for full Builder functionality where no constructor is used
    // use dummy field until one is set
    if (field == null) {
      field = 'no_field_set';
    }
  
    query.common[field] = {};
  
    // only set the query is one is passed in
    if (qstr != null) {
      query.common[field].query = qstr;
    }
  
    return extend(_common, {

      /**
            Sets the field to query against.

            @member ejs.CommonTermsQuery
            @param {String} f A valid field name.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      field: function (f) {
        var oldValue = query.common[field];
    
        if (f == null) {
          return field;
        }

        delete query.common[field];
        field = f;
        query.common[f] = oldValue;
    
        return this;
      },
  
      /**
            Sets the query string.

            @member ejs.CommonTermsQuery
            @param {String} qstr The query string.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      query: function (qstr) {
        if (qstr == null) {
          return query.common[field].query;
        }

        query.common[field].query = qstr;
        return this;
      },

      /**
            Sets the analyzer name used to analyze the <code>Query</code> object.

            @member ejs.CommonTermsQuery
            @param {String} analyzer A valid analyzer name.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      analyzer: function (analyzer) {
        if (analyzer == null) {
          return query.common[field].analyzer;
        }

        query.common[field].analyzer = analyzer;
        return this;
      },
    
      /**
            Enables or disables similarity coordinate scoring of documents
            commoning the <code>Query</code>. Default: false.

            @member ejs.CommonTermsQuery
            @param {String} trueFalse A <code>true/false</code value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      disableCoord: function (trueFalse) {
        if (trueFalse == null) {
          return query.common[field].disable_coord;
        }

        query.common[field].disable_coord = trueFalse;
        return this;
      },
          
      /**
            Sets the maximum threshold/frequency to be considered a low 
            frequency term.  Set to a value between 0 and 1.

            @member ejs.CommonTermsQuery
            @param {Number} freq A positive <code>double</code> value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      cutoffFrequency: function (freq) {
        if (freq == null) {
          return query.common[field].cutoff_frequency;
        }

        query.common[field].cutoff_frequency = freq;
        return this;
      },

      /**
            Sets the boolean operator to be used for high frequency terms.
            Default: AND

            @member ejs.CommonTermsQuery
            @param {String} op Any of "and" or "or", no quote characters.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      highFreqOperator: function (op) {
        if (op == null) {
          return query.common[field].high_freq_operator;
        }

        op = op.toLowerCase();
        if (op === 'and' || op === 'or') {
          query.common[field].high_freq_operator = op;
        }

        return this;
      },
    
      /**
            Sets the boolean operator to be used for low frequency terms.
            Default: AND
          
            @member ejs.CommonTermsQuery
            @param {String} op Any of "and" or "or", no quote characters.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      lowFreqOperator: function (op) {
        if (op == null) {
          return query.common[field].low_freq_operator;
        }

        op = op.toLowerCase();
        if (op === 'and' || op === 'or') {
          query.common[field].low_freq_operator = op;
        }

        return this;
      },
    
      /**
            Sets the minimum number of low freq matches that need to match in 
            a document before that document is returned in the results.

            @member ejs.CommonTermsQuery
            @param {Integer} min A positive integer.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      minimumShouldMatch: function (min) {
        if (min == null) {
          return query.common[field].minimum_should_match.low_freq;
        }
    
        if (query.common[field].minimum_should_match == null) {
          query.common[field].minimum_should_match = {};
        }
        
        query.common[field].minimum_should_match.low_freq = min;
        return this;
      },

      /**
            Sets the minimum number of low freq matches that need to match in 
            a document before that document is returned in the results.

            @member ejs.CommonTermsQuery
            @param {Integer} min A positive integer.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      minimumShouldMatchLowFreq: function (min) {
        return this.minimumShouldMatch(min);
      },
      
      /**
            Sets the minimum number of high freq matches that need to match in 
            a document before that document is returned in the results.

            @member ejs.CommonTermsQuery
            @param {Integer} min A positive integer.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      minimumShouldMatchHighFreq: function (min) {
        if (min == null) {
          return query.common[field].minimum_should_match.high_freq;
        }
    
        if (query.common[field].minimum_should_match == null) {
          query.common[field].minimum_should_match = {};
        }
        
        query.common[field].minimum_should_match.high_freq = min;
        return this;
      },
      
      /**
            Sets the boost value for documents commoning the <code>Query</code>.

            @member ejs.CommonTermsQuery
            @param {Number} boost A positive <code>double</code> value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      boost: function (boost) {
        if (boost == null) {
          return query.common[field].boost;
        }

        query.common[field].boost = boost;
        return this;
      }

    });
  };

  /**
    @class
    <p>A constant score query wraps another <code>Query</code> or
    <code>Filter</code> and returns a constant score for each
    result that is equal to the query boost.</p>

    <p>Note that lucene's query normalization (queryNorm) attempts
    to make scores between different queries comparable.  It does not
    change the relevance of your query, but it might confuse you when
    you look at the score of your documents and they are not equal to
    the query boost value as expected.  The scores were normalized by
    queryNorm, but maintain the same relevance.</p>

    @name ejs.ConstantScoreQuery
    @ejs query
    @borrows ejs.QueryMixin.boost as boost
    @borrows ejs.QueryMixin._type as _type
    @borrows ejs.QueryMixin.toJSON as toJSON

    @desc
    <p>Constructs a query where each documents returned by the internal
    query or filter have a constant score equal to the boost factor.</p>

     */
  ejs.ConstantScoreQuery = function () {

    var
      _common = ejs.QueryMixin('constant_score'),
      query = _common.toJSON();

    return extend(_common, {
      /**
             Adds the query to apply a constant score to.

             @member ejs.ConstantScoreQuery
             @param {Object} oQuery A valid <code>Query</code> object
             @returns {Object} returns <code>this</code> so that calls can be chained.
             */
      query: function (oQuery) {
        if (oQuery == null) {
          return query.constant_score.query;
        }
      
        if (!isQuery(oQuery)) {
          throw new TypeError('Argument must be a Query');
        }
        
        query.constant_score.query = oQuery.toJSON();
        return this;
      },

      /**
             Adds the filter to apply a constant score to.

             @member ejs.ConstantScoreQuery
             @param {Object} oFilter A valid <code>Filter</code> object
             @returns {Object} returns <code>this</code> so that calls can be chained.
             */
      filter: function (oFilter) {
        if (oFilter == null) {
          return query.constant_score.filter;
        }
      
        if (!isFilter(oFilter)) {
          throw new TypeError('Argument must be a Filter');
        }
        
        query.constant_score.filter = oFilter.toJSON();
        return this;
      },

      /**
            Enables caching of the filter.

            @member ejs.ConstantScoreQuery
            @param {Boolean} trueFalse A boolean value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      cache: function (trueFalse) {
        if (trueFalse == null) {
          return query.constant_score._cache;
        }

        query.constant_score._cache = trueFalse;
        return this;
      },
      
      /**
            Set the cache key.

            @member ejs.ConstantScoreQuery
            @param {String} k A string cache key.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      cacheKey: function (k) {
        if (k == null) {
          return query.constant_score._cache_key;
        }

        query.constant_score._cache_key = k;
        return this;
      }
      
    });
  };

  /**
    @class
    A query that generates the union of documents produced by its subqueries, and
    that scores each document with the maximum score for that document as produced
    by any subquery, plus a tie breaking increment for any additional matching
    subqueries.

    @name ejs.DisMaxQuery
    @ejs query
    @borrows ejs.QueryMixin.boost as boost
    @borrows ejs.QueryMixin._type as _type
    @borrows ejs.QueryMixin.toJSON as toJSON

    @desc
    A query that generates the union of documents produced by its subqueries such
    as <code>termQuerys, phraseQuerys</code>, <code>boolQuerys</code>, etc.

    */
  ejs.DisMaxQuery = function () {

    var
      _common = ejs.QueryMixin('dis_max'),
      query = _common.toJSON();

    return extend(_common, {

      /**
            Updates the queries.  If passed a single Query, it is added to the
            list of existing queries.  If passed an array of Queries, it 
            replaces all existing values.

            @member ejs.DisMaxQuery
            @param {(Query|Query[])} qs A single Query or an array of Queries
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      queries: function (qs) {
        var i, len;
        
        if (qs == null) {
          return query.dis_max.queries;
        }
      
        if (query.dis_max.queries == null) {
          query.dis_max.queries = [];
        }
        
        if (isQuery(qs)) {
          query.dis_max.queries.push(qs.toJSON());
        } else if (isArray(qs)) {
          query.dis_max.queries = [];
          for (i = 0, len = qs.length; i < len; i++) {
            if (!isQuery(qs[i])) {
              throw new TypeError('Argument must be array of Queries');
            }
            
            query.dis_max.queries.push(qs[i].toJSON());
          }
        } else {
          throw new TypeError('Argument must be a Query or array of Queries');
        }

        return this;
      },

      /**
            <p>The tie breaker value.</p>  

            <p>The tie breaker capability allows results that include the same term in multiple 
            fields to be judged better than results that include this term in only the best of those 
            multiple fields, without confusing this with the better case of two different terms in 
            the multiple fields.</p>  

            <p>Default: 0.0.</p>

            @member ejs.DisMaxQuery
            @param {Double} tieBreaker A positive <code>double</code> value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      tieBreaker: function (tieBreaker) {
        if (tieBreaker == null) {
          return query.dis_max.tie_breaker;
        }

        query.dis_max.tie_breaker = tieBreaker;
        return this;
      }
      
    });
  };
  

  /**
    @class
    <p>Wrapper to allow SpanQuery objects participate in composite single-field 
    SpanQueries by 'lying' about their search field. That is, the masked 
    SpanQuery will function as normal, but when asked for the field it 
    queries against, it will return the value specified as the masked field vs.
    the real field used in the wrapped span query.</p>

    @name ejs.FieldMaskingSpanQuery
    @ejs query
    @borrows ejs.QueryMixin.boost as boost
    @borrows ejs.QueryMixin._type as _type
    @borrows ejs.QueryMixin.toJSON as toJSON

    @desc
    Wraps a SpanQuery and hides the real field being searched across.

    @param {Query} spanQry A valid SpanQuery
    @param {Integer} field the maximum field position in a match.
  
    */
  ejs.FieldMaskingSpanQuery = function (spanQry, field) {

    if (!isQuery(spanQry)) {
      throw new TypeError('Argument must be a SpanQuery');
    }
  
    var 
      _common = ejs.QueryMixin('field_masking_span'),
      query = _common.toJSON();
    
    query.field_masking_span.query = spanQry.toJSON();
    query.field_masking_span.field = field;

    return extend(_common, {

      /**
            Sets the span query to wrap.

            @member ejs.FieldMaskingSpanQuery
            @param {Query} spanQuery Any valid span type query.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      query: function (spanQuery) {
        if (spanQuery == null) {
          return query.field_masking_span.query;
        }
    
        if (!isQuery(spanQuery)) {
          throw new TypeError('Argument must be a SpanQuery');
        }
      
        query.field_masking_span.query = spanQuery.toJSON();
        return this;
      },

      /**
            Sets the value of the "masked" field.  

            @member ejs.FieldMaskingSpanQuery
            @param {String} f A field name the wrapped span query should use
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      field: function (f) {
        if (f == null) {
          return query.field_masking_span.field;
        }
    
        query.field_masking_span.field = f;
        return this;
      }
      
    });
  };

  /**
    @class
    <p>Filter queries allow you to restrict the results returned by a query. There are
    several different types of filters that can be applied
    (see <a href="/jsdocs/ejs.filter.html">filter</a> module). A <code>filterQuery</code>
    takes a <code>Query</code> and a <code>Filter</code> object as arguments and constructs
    a new <code>Query</code> that is then used for the search.</p>

    @name ejs.FilteredQuery
    @ejs query
    @borrows ejs.QueryMixin.boost as boost
    @borrows ejs.QueryMixin._type as _type
    @borrows ejs.QueryMixin.toJSON as toJSON

    @desc
    <p>A query that applies a filter to the results of another query.</p>

    @param {Object} someQuery a valid <code>Query</code> object
    @param {Object} someFilter a valid <code>Filter</code> object.  This parameter
      is optional.

     */
  ejs.FilteredQuery = function (someQuery, someFilter) {

    if (!isQuery(someQuery)) {
      throw new TypeError('Argument must be a Query');
    }
    
    if (someFilter != null && !isFilter(someFilter)) {
      throw new TypeError('Argument must be a Filter');
    }
    
    var 
      _common = ejs.QueryMixin('filtered'),
      query = _common.toJSON();
    
    query.filtered.query = someQuery.toJSON();

    if (someFilter != null) {
      query.filtered.filter = someFilter.toJSON();
    }
    
    return extend(_common, {

      /**
             <p>Adds the query to apply a constant score to.</p>

             @member ejs.FilteredQuery
             @param {Object} oQuery A valid <code>Query</code> object
             @returns {Object} returns <code>this</code> so that calls can be chained.
             */
      query: function (oQuery) {
        if (oQuery == null) {
          return query.filtered.query;
        }
      
        if (!isQuery(oQuery)) {
          throw new TypeError('Argument must be a Query');
        }
        
        query.filtered.query = oQuery.toJSON();
        return this;
      },

      /**
             <p>Adds the filter to apply a constant score to.</p>

             @member ejs.FilteredQuery
             @param {Object} oFilter A valid <code>Filter</code> object
             @returns {Object} returns <code>this</code> so that calls can be chained.
             */
      filter: function (oFilter) {
        if (oFilter == null) {
          return query.filtered.filter;
        }
      
        if (!isFilter(oFilter)) {
          throw new TypeError('Argument must be a Filter');
        }
        
        query.filtered.filter = oFilter.toJSON();
        return this;
      },

      /**
            <p>Sets the filter strategy.</p>  

            <p>The strategy defines how the filter is applied during document collection.  
            Valid values are:</p>
            
            <dl>
                <dd><code>query_first</code> - advance query scorer first then filter</dd>
                <dd><code>random_access_random</code> - random access filter</dd>
                <dd><code>leap_frog</code> - query scorer and filter "leap-frog", query goes first</dd>
                <dd><code>leap_frog_filter_first</code> - same as <code>leap_frog</code>, but filter goes first</dd>
                <dd><code>random_access_N</code> - replace <code>N</code> with integer, same as random access 
                 except you can specify a custom threshold</dd>
            </dl>

            <p>This is an advanced setting, use with care.</p>
            
            @member ejs.FilteredQuery
            @param {String} strategy The strategy as a string.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      strategy: function (strategy) {
        if (strategy == null) {
          return query.filtered.strategy;
        }

        strategy = strategy.toLowerCase();
        if (strategy === 'query_first' || strategy === 'random_access_always' ||
          strategy === 'leap_frog' || strategy === 'leap_frog_filter_first' ||
          strategy.indexOf('random_access_') === 0) {
            
          query.filtered.strategy = strategy;
        }
        
        return this;
      },
      
      /**
            <p>Enables caching of the filter.</p>

            @member ejs.FilteredQuery
            @param {Boolean} trueFalse A boolean value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      cache: function (trueFalse) {
        if (trueFalse == null) {
          return query.filtered._cache;
        }

        query.filtered._cache = trueFalse;
        return this;
      },
      
      /**
            <p>Set the cache key.</p>

            @member ejs.FilteredQuery
            @param {String} k A string cache key.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      cacheKey: function (k) {
        if (k == null) {
          return query.filtered._cache_key;
        }

        query.filtered._cache_key = k;
        return this;
      }
      
    });
  };

  /**
    @class
    <p>The function_score allows you to modify the score of documents that are
    retrieved by a query. This can be useful if, for example, a score function is
    computationally expensive and it is sufficient to compute the score on a
    filtered set of documents.</p>

    @name ejs.FunctionScoreQuery
    @ejs query
    @borrows ejs.QueryMixin.boost as boost
    @borrows ejs.QueryMixin._type as _type
    @borrows ejs.QueryMixin.toJSON as toJSON

    @desc
    <p>A query that allows you to modify the score of matching documents.</p>

     */
  ejs.FunctionScoreQuery = function () {

    var
      _common = ejs.QueryMixin('function_score'),
      query = _common.toJSON();

    return extend(_common, {

      /**
      Set the source query.

      @member ejs.FunctionScoreQuery
      @param {Query} oQuery A valid <code>Query</code> object
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      query: function (oQuery) {
        if (oQuery == null) {
          return query.function_score.query;
        }

        if (!isQuery(oQuery)) {
          throw new TypeError('Argument must be a Query');
        }

        query.function_score.query = oQuery.toJSON();
        return this;
      },

      /**
      Set the source filter.

      @member ejs.FunctionScoreQuery
      @param {Filter} oFilter A valid <code>Filter</code> object
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      filter: function (oFilter) {
        if (oFilter == null) {
          return query.function_score.filter;
        }

        if (!isFilter(oFilter)) {
          throw new TypeError('Argument must be a Filter');
        }

        query.function_score.filter = oFilter.toJSON();
        return this;
      },

      /**
      Set the scoring mode which specifies how the computed scores are combined.
      Valid values are: avg, max, min, sum, multiply, and first.

      @member ejs.FunctionScoreQuery
      @param {String} mode A scoring mode.
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      scoreMode: function (mode) {
        if (mode == null) {
          return query.function_score.score_mode;
        }

        mode = mode.toLowerCase();
        if (mode === 'avg' || mode === 'max' || mode === 'min' ||
              mode === 'sum' || mode === 'multiply' || mode === 'first') {
          query.function_score.score_mode = mode;
        }

        return this;
      },

      /**
      Set the setermines how the new calculated score is combined with the
      score from the original query. Valid values are: multiply, replace, sum,
      avg, max, and min.

      @member ejs.FunctionScoreQuery
      @param {String} mode A boosting mode.
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      boostMode: function (mode) {
        if (mode == null) {
          return query.function_score.boost_mode;
        }

        mode = mode.toLowerCase();
        if (mode === 'multiply' || mode === 'replace' || mode === 'sum' ||
              mode === 'avg' || mode === 'max' || mode === 'min') {
          query.function_score.boost_mode = mode;
        }

        return this;
      },

      /**
      Sets the boost value for all documents matching the query.

      @member ejs.FunctionScoreQuery
      @param {Float} boost A positive <code>float</code> value.
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      boost: function (boost) {
        if (boost == null) {
          return query.function_score.boost;
        }

        query.function_score.boost = boost;
        return this;
      },

      /**
      Add a single score function to the list of existing functions.

      @member ejs.FunctionScoreQuery
      @param {ScoreFunction} func A valid <code>ScoreFunction</code> object.
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      function: function (func) {
        if (query.function_score.functions == null) {
          query.function_score.functions = [];
        }

        if (func == null) {
          return query.function_score.functions;
        }

        if (!isScoreFunction(func)) {
          throw new TypeError('Argument must be a ScoreFunction');
        }

        query.function_score.functions.push(func.toJSON());
        return this;
      },

      /**
      Sets the score functions.  Replaces any existing score functions.

      @member ejs.FunctionScoreQuery
      @param {ScoreFunction[]} funcs A array of <code>ScoreFunctions</code>.
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      functions: function (funcs) {
        var i, len;

        if (funcs == null) {
          return query.function_score.functions;
        }

        if (!isArray(funcs)) {
          throw new TypeError('Argument must be an array of ScoreFunctions');
        }

        query.function_score.functions = [];
        for (i = 0, len = funcs.length; i < len; i++) {
          if (!isScoreFunction(funcs[i])) {
            throw new TypeError('Argument must be an array of ScoreFunctions');
          }

          query.function_score.functions.push(funcs[i].toJSON());
        }

        return this;
      }

    });
  };

  /**
    @class
    <p>The fuzzy_like_this_field query is the same as the fuzzy_like_this 
    query, except that it runs against a single field. It provides nicer query 
    DSL over the generic fuzzy_like_this query, and support typed fields 
    query (automatically wraps typed fields with type filter to match only on 
    the specific type).</p>

    <p>Fuzzifies ALL terms provided as strings and then picks the best n 
    differentiating terms. In effect this mixes the behaviour of FuzzyQuery and 
    MoreLikeThis but with special consideration of fuzzy scoring factors. This 
    generally produces good results for queries where users may provide details 
    in a number of fields and have no knowledge of boolean query syntax and 
    also want a degree of fuzzy matching and a fast query.</p>

    <p>For each source term the fuzzy variants are held in a BooleanQuery with 
    no coord factor (because we are not looking for matches on multiple variants 
    in any one doc). Additionally, a specialized TermQuery is used for variants 
    and does not use that variant term’s IDF because this would favour rarer 
    terms eg misspellings. Instead, all variants use the same IDF 
    ranking (the one for the source query term) and this is factored into the 
    variant’s boost. If the source query term does not exist in the index the 
    average IDF of the variants is used.</p>

    @name ejs.FuzzyLikeThisFieldQuery
    @ejs query
    @borrows ejs.QueryMixin._type as _type
    @borrows ejs.QueryMixin.toJSON as toJSON

    @desc
    <p>Constructs a query where each documents returned are “like” provided text</p>

    @param {String} field The field to run the query against.
    @param {String} likeText The text to find documents like it.
    */
  ejs.FuzzyLikeThisFieldQuery = function (field, likeText) {

    var
      _common = ejs.QueryMixin('flt_field'),
      query = _common.toJSON();

    query.flt_field[field] = {
      like_text: likeText
    };
  
    return extend(_common, {
  
      /**
             The field to run the query against.

             @member ejs.FuzzyLikeThisFieldQuery
             @param {String} f A single field name.
             @returns {Object} returns <code>this</code> so that calls can be chained.
             */
      field: function (f) {
        var oldValue = query.flt_field[field];
      
        if (f == null) {
          return field;
        }
    
        delete query.flt_field[field];
        field = f;
        query.flt_field[f] = oldValue;
    
        return this;
      },
  
      /**
            The text to find documents like

            @member ejs.FuzzyLikeThisFieldQuery
            @param {String} s A text string.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      likeText: function (txt) {
        if (txt == null) {
          return query.flt_field[field].like_text;
        }
  
        query.flt_field[field].like_text = txt;
        return this;
      },

      /**
            Should term frequency be ignored. Defaults to false.

            @member ejs.FuzzyLikeThisFieldQuery
            @param {Boolean} trueFalse A boolean value
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      ignoreTf: function (trueFalse) {
        if (trueFalse == null) {
          return query.flt_field[field].ignore_tf;
        }
  
        query.flt_field[field].ignore_tf = trueFalse;
        return this;
      },

      /**
            The maximum number of query terms that will be included in any 
            generated query. Defaults to 25.

            @member ejs.FuzzyLikeThisFieldQuery
            @param {Integer} max A positive integer value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      maxQueryTerms: function (max) {
        if (max == null) {
          return query.flt_field[field].max_query_terms;
        }
  
        query.flt_field[field].max_query_terms = max;
        return this;
      },

      /**
            The minimum similarity of the term variants. Defaults to 0.5.

            @member ejs.FuzzyLikeThisFieldQuery
            @param {Double} min A positive double value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      minSimilarity: function (min) {
        if (min == null) {
          return query.flt_field[field].min_similarity;
        }
  
        query.flt_field[field].min_similarity = min;
        return this;
      },

      /**
            Length of required common prefix on variant terms. Defaults to 0..

            @member ejs.FuzzyLikeThisFieldQuery
            @param {Integer} len A positive integer value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      prefixLength: function (len) {
        if (len == null) {
          return query.flt_field[field].prefix_length;
        }
  
        query.flt_field[field].prefix_length = len;
        return this;
      },

      /**
            The analyzer that will be used to analyze the text. Defaults to the 
            analyzer associated with the field.

            @member ejs.FuzzyLikeThisFieldQuery
            @param {String} analyzerName The name of the analyzer.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      analyzer: function (analyzerName) {
        if (analyzerName == null) {
          return query.flt_field[field].analyzer;
        }
  
        query.flt_field[field].analyzer = analyzerName;
        return this;
      },
      
      /**
            Should the <code>Query</code> fail when an unsupported field
            is specified. Defaults to true.

            @member ejs.FuzzyLikeThisFieldQuery
            @param {Boolean} trueFalse A boolean value
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      failOnUnsupportedField: function (trueFalse) {
        if (trueFalse == null) {
          return query.flt_field[field].fail_on_unsupported_field;
        }
  
        query.flt_field[field].fail_on_unsupported_field = trueFalse;
        return this;
      },
                     
      /**
            Sets the boost value of the <code>Query</code>.

            @member ejs.FuzzyLikeThisFieldQuery
            @param {Double} boost A positive <code>double</code> value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      boost: function (boost) {
        if (boost == null) {
          return query.flt_field[field].boost;
        }

        query.flt_field[field].boost = boost;
        return this;
      }
      
    });
  };

  /**
    @class
    <p>Fuzzy like this query find documents that are “like” provided text by 
    running it against one or more fields.</p>

    <p>Fuzzifies ALL terms provided as strings and then picks the best n 
    differentiating terms. In effect this mixes the behaviour of FuzzyQuery and 
    MoreLikeThis but with special consideration of fuzzy scoring factors. This 
    generally produces good results for queries where users may provide details 
    in a number of fields and have no knowledge of boolean query syntax and 
    also want a degree of fuzzy matching and a fast query.</p>
  
    <p>For each source term the fuzzy variants are held in a BooleanQuery with 
    no coord factor (because we are not looking for matches on multiple variants 
    in any one doc). Additionally, a specialized TermQuery is used for variants 
    and does not use that variant term’s IDF because this would favour rarer 
    terms eg misspellings. Instead, all variants use the same IDF 
    ranking (the one for the source query term) and this is factored into the 
    variant’s boost. If the source query term does not exist in the index the 
    average IDF of the variants is used.</p>

    @name ejs.FuzzyLikeThisQuery
    @ejs query
    @borrows ejs.QueryMixin.boost as boost
    @borrows ejs.QueryMixin._type as _type
    @borrows ejs.QueryMixin.toJSON as toJSON

    @desc
    <p>Constructs a query where each documents returned are “like” provided text</p>

    @param {String} likeText The text to find documents like it.
    */
  ejs.FuzzyLikeThisQuery = function (likeText) {

    var 
      _common = ejs.QueryMixin('flt'),
      query = _common.toJSON();
    
    query.flt.like_text = likeText;

    return extend(_common, {
    
      /**
             The fields to run the query against.  If you call with a single field,
             it is added to the existing list of fields.  If called with an array
             of field names, it replaces any existing values with the new array.

             @member ejs.FuzzyLikeThisQuery
             @param {(String|String[])} f A single field name or a list of field names.
             @returns {Object} returns <code>this</code> so that calls can be chained.
             */
      fields: function (f) {
        if (query.flt.fields == null) {
          query.flt.fields = [];
        }
      
        if (f == null) {
          return query.flt.fields;
        }
      
        if (isString(f)) {
          query.flt.fields.push(f);
        } else if (isArray(f)) {
          query.flt.fields = f;
        } else {
          throw new TypeError('Argument must be a string or array');
        }
      
        return this;
      },
    
      /**
            The text to find documents like

            @member ejs.FuzzyLikeThisQuery
            @param {String} s A text string.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      likeText: function (txt) {
        if (txt == null) {
          return query.flt.like_text;
        }
    
        query.flt.like_text = txt;
        return this;
      },

      /**
            Should term frequency be ignored. Defaults to false.

            @member ejs.FuzzyLikeThisQuery
            @param {Boolean} trueFalse A boolean value
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      ignoreTf: function (trueFalse) {
        if (trueFalse == null) {
          return query.flt.ignore_tf;
        }
    
        query.flt.ignore_tf = trueFalse;
        return this;
      },

      /**
            The maximum number of query terms that will be included in any 
            generated query. Defaults to 25.

            @member ejs.FuzzyLikeThisQuery
            @param {Integer} max A positive integer value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      maxQueryTerms: function (max) {
        if (max == null) {
          return query.flt.max_query_terms;
        }
    
        query.flt.max_query_terms = max;
        return this;
      },

      /**
            The minimum similarity of the term variants. Defaults to 0.5.

            @member ejs.FuzzyLikeThisQuery
            @param {Double} min A positive double value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      minSimilarity: function (min) {
        if (min == null) {
          return query.flt.min_similarity;
        }
    
        query.flt.min_similarity = min;
        return this;
      },

      /**
            Length of required common prefix on variant terms. Defaults to 0..

            @member ejs.FuzzyLikeThisQuery
            @param {Integer} len A positive integer value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      prefixLength: function (len) {
        if (len == null) {
          return query.flt.prefix_length;
        }
    
        query.flt.prefix_length = len;
        return this;
      },

      /**
            The analyzer that will be used to analyze the text. Defaults to the 
            analyzer associated with the field.

            @member ejs.FuzzyLikeThisQuery
            @param {String} analyzerName The name of the analyzer.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      analyzer: function (analyzerName) {
        if (analyzerName == null) {
          return query.flt.analyzer;
        }
    
        query.flt.analyzer = analyzerName;
        return this;
      },
      
      /**
            Should the <code>Query</code> fail when an unsupported field
            is specified. Defaults to true.

            @member ejs.FuzzyLikeThisQuery
            @param {Boolean} trueFalse A boolean value
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      failOnUnsupportedField: function (trueFalse) {
        if (trueFalse == null) {
          return query.flt.fail_on_unsupported_field;
        }
  
        query.flt.fail_on_unsupported_field = trueFalse;
        return this;
      }
      
    });
  };

  /**
    @class
    <p>A fuzzy search query based on the Damerau-Levenshtein (optimal string 
    alignment) algorithm, though you can explicitly choose classic Levenshtein 
    by passing false to the transpositions parameter./p>
  
    <p>fuzzy query on a numeric field will result in a range query “around” 
    the value using the min_similarity value. As an example, if you perform a
    fuzzy query against a field value of "12" with a min similarity setting
    of "2", the query will search for values between "10" and "14".</p>

    @name ejs.FuzzyQuery
    @ejs query
    @borrows ejs.QueryMixin._type as _type
    @borrows ejs.QueryMixin.toJSON as toJSON

    @desc
    <p>Constructs a query where each documents returned are “like” provided text</p>
    
    @param {String} field The field to run the fuzzy query against.
    @param {String} value The value to fuzzify.
    
     */
  ejs.FuzzyQuery = function (field, value) {

    var
      _common = ejs.QueryMixin('fuzzy'),
      query = _common.toJSON();

    query.fuzzy[field] = {
      value: value
    };

    return extend(_common, {

      /**
             <p>The field to run the query against.</p>

             @member ejs.FuzzyQuery
             @param {String} f A single field name.
             @returns {Object} returns <code>this</code> so that calls can be chained.
             */
      field: function (f) {
        var oldValue = query.fuzzy[field];
    
        if (f == null) {
          return field;
        }
  
        delete query.fuzzy[field];
        field = f;
        query.fuzzy[f] = oldValue;
  
        return this;
      },

      /**
            <p>The query text to fuzzify.</p>

            @member ejs.FuzzyQuery
            @param {String} s A text string.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      value: function (txt) {
        if (txt == null) {
          return query.fuzzy[field].value;
        }

        query.fuzzy[field].value = txt;
        return this;
      },

      /**
            <p>Set to false to use classic Levenshtein edit distance.</p>

            @member ejs.FuzzyQuery
            @param {Boolean} trueFalse A boolean value
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      transpositions: function (trueFalse) {
        if (trueFalse == null) {
          return query.fuzzy[field].transpositions;
        }

        query.fuzzy[field].transpositions = trueFalse;
        return this;
      },

      /**
            <p>The maximum number of query terms that will be included in any 
            generated query. Defaults to <code>50</code>.<p>

            @member ejs.FuzzyQuery
            @param {Integer} max A positive integer value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      maxExpansions: function (max) {
        if (max == null) {
          return query.fuzzy[field].max_expansions;
        }

        query.fuzzy[field].max_expansions = max;
        return this;
      },

      /**
            <p>The minimum similarity of the term variants. Defaults to <code>0.5</code>.</p>

            @member ejs.FuzzyQuery
            @param {Double} min A positive double value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      minSimilarity: function (min) {
        if (min == null) {
          return query.fuzzy[field].min_similarity;
        }

        query.fuzzy[field].min_similarity = min;
        return this;
      },

      /**
            <p>Length of required common prefix on variant terms. Defaults to <code>0</code>.</p>

            @member ejs.FuzzyQuery
            @param {Integer} len A positive integer value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      prefixLength: function (len) {
        if (len == null) {
          return query.fuzzy[field].prefix_length;
        }

        query.fuzzy[field].prefix_length = len;
        return this;
      },
      
      /**
            <p>Sets rewrite method.  Valid values are:</p> 
            
            <dl>
                <dd><code>constant_score_auto</code> - tries to pick the best constant-score rewrite 
                 method based on term and document counts from the query</dd>
              
                <dd><code>scoring_boolean</code> - translates each term into boolean should and 
                 keeps the scores as computed by the query</dd>
              
                <dd><code>constant_score_boolean</code> - same as scoring_boolean, expect no scores
                 are computed.</dd>
              
                <dd><code>constant_score_filter</code> - first creates a private Filter, by visiting 
                 each term in sequence and marking all docs for that term</dd>
              
                <dd><code>top_terms_boost_N</code> - first translates each term into boolean should
                 and scores are only computed as the boost using the top <code>N</code>
                 scoring terms.  Replace <code>N</code> with an integer value.</dd>
              
                <dd><code>top_terms_N</code> - first translates each term into boolean should
                 and keeps the scores as computed by the query. Only the top <code>N</code>
                 scoring terms are used.  Replace <code>N</code> with an integer value.</dd>
            </dl>
            
            <p>Default is <code>constant_score_auto</code>.</p>

            <p>This is an advanced option, use with care.</p>

            @member ejs.FuzzyQuery
            @param {String} m The rewrite method as a string.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      rewrite: function (m) {
        if (m == null) {
          return query.fuzzy[field].rewrite;
        }
        
        m = m.toLowerCase();
        if (m === 'constant_score_auto' || m === 'scoring_boolean' ||
          m === 'constant_score_boolean' || m === 'constant_score_filter' ||
          m.indexOf('top_terms_boost_') === 0 || 
          m.indexOf('top_terms_') === 0) {
            
          query.fuzzy[field].rewrite = m;
        }
        
        return this;
      },
      
                    
      /**
            <p>Sets the boost value of the <code>Query</code>.</p>

            @member ejs.FuzzyQuery
            @param {Double} boost A positive <code>double</code> value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      boost: function (boost) {
        if (boost == null) {
          return query.fuzzy[field].boost;
        }

        query.fuzzy[field].boost = boost;
        return this;
      }
      
    });
  };

  /**
    @class
    <p>Efficient querying of documents containing shapes indexed using the 
    geo_shape type.</p>

    <p>Much like the geo_shape type, the geo_shape query uses a grid square 
    representation of the query shape to find those documents which have shapes 
    that relate to the query shape in a specified way. In order to do this, the 
    field being queried must be of geo_shape type. The query will use the same 
    PrefixTree configuration as defined for the field.</p>
  
    @name ejs.GeoShapeQuery
    @ejs query
    @borrows ejs.QueryMixin._type as _type
    @borrows ejs.QueryMixin.toJSON as toJSON

    @desc
    A Query to find documents with a geo_shapes matching a specific shape.

    */
  ejs.GeoShapeQuery = function (field) {

    var
      _common = ejs.QueryMixin('geo_shape'),
      query = _common.toJSON();

    query.geo_shape[field] = {};

    return extend(_common, {

      /**
            Sets the field to query against.

            @member ejs.GeoShapeQuery
            @param {String} f A valid field name.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      field: function (f) {
        var oldValue = query.geo_shape[field];
    
        if (f == null) {
          return field;
        }

        delete query.geo_shape[field];
        field = f;
        query.geo_shape[f] = oldValue;
    
        return this;
      },

      /**
            Sets the shape

            @member ejs.GeoShapeQuery
            @param {String} shape A valid <code>Shape</code> object.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      shape: function (shape) {
        if (shape == null) {
          return query.geo_shape[field].shape;
        }

        if (query.geo_shape[field].indexed_shape != null) {
          delete query.geo_shape[field].indexed_shape;
        }
        
        query.geo_shape[field].shape = shape.toJSON();
        return this;
      },

      /**
            Sets the indexed shape.  Use this if you already have shape definitions
            already indexed.

            @member ejs.GeoShapeQuery
            @param {String} indexedShape A valid <code>IndexedShape</code> object.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      indexedShape: function (indexedShape) {
        if (indexedShape == null) {
          return query.geo_shape[field].indexed_shape;
        }

        if (query.geo_shape[field].shape != null) {
          delete query.geo_shape[field].shape;
        }
        
        query.geo_shape[field].indexed_shape = indexedShape.toJSON();
        return this;
      },

      /**
            Sets the shape relation type.  A relationship between a Query Shape 
            and indexed Shapes that will be used to determine if a Document 
            should be matched or not.  Valid values are:  intersects, disjoint,
            and within.

            @member ejs.GeoShapeQuery
            @param {String} indexedShape A valid <code>IndexedShape</code> object.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      relation: function (relation) {
        if (relation == null) {
          return query.geo_shape[field].relation;
        }

        relation = relation.toLowerCase();
        if (relation === 'intersects' || relation === 'disjoint' || relation === 'within') {
          query.geo_shape[field].relation = relation;
        }
      
        return this;
      },

      /**
            <p>Sets the spatial strategy.</p>  
            <p>Valid values are:</p>
            
            <dl>
                <dd><code>recursive</code> - default, recursively traverse nodes in
                  the spatial prefix tree.  This strategy has support for 
                  searching non-point shapes.</dd>
                <dd><code>term</code> - uses a large TermsFilter on each node
                  in the spatial prefix tree.  It only supports the search of 
                  indexed Point shapes.</dd>
            </dl>

            <p>This is an advanced setting, use with care.</p>
            
            @since elasticsearch 0.90
            @member ejs.GeoShapeQuery
            @param {String} strategy The strategy as a string.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      strategy: function (strategy) {
        if (strategy == null) {
          return query.geo_shape[field].strategy;
        }

        strategy = strategy.toLowerCase();
        if (strategy === 'recursive' || strategy === 'term') {
          query.geo_shape[field].strategy = strategy;
        }
        
        return this;
      },
             
      /**
            Sets the boost value for documents matching the <code>Query</code>.

            @member ejs.GeoShapeQuery
            @param {Number} boost A positive <code>double</code> value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      boost: function (boost) {
        if (boost == null) {
          return query.geo_shape[field].boost;
        }

        query.geo_shape[field].boost = boost;
        return this;
      }
      
    });
  };

  /**
    @class
    <p>The has_child query works the same as the has_child filter, 
    by automatically wrapping the filter with a constant_score. Results in 
    parent documents that have child docs matching the query being returned.</p>
  
    @name ejs.HasChildQuery
    @ejs query
    @borrows ejs.QueryMixin.boost as boost
    @borrows ejs.QueryMixin._type as _type
    @borrows ejs.QueryMixin.toJSON as toJSON

    @desc
    Returns results that have child documents matching the query.

    @param {Object} qry A valid query object.
    @param {String} type The child type
    */
  ejs.HasChildQuery = function (qry, type) {

    if (!isQuery(qry)) {
      throw new TypeError('Argument must be a valid Query');
    }
    
    var 
      _common = ejs.QueryMixin('has_child'),
      query = _common.toJSON();
    
    query.has_child.query = qry.toJSON();
    query.has_child.type = type;

    return extend(_common, {

      /**
            Sets the query

            @member ejs.HasChildQuery
            @param {Object} q A valid Query object
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      query: function (q) {
        if (q == null) {
          return query.has_child.query;
        }
    
        if (!isQuery(q)) {
          throw new TypeError('Argument must be a valid Query');
        }
        
        query.has_child.query = q.toJSON();
        return this;
      },

      /**
            Sets the child document type to search against

            @member ejs.HasChildQuery
            @param {String} t A valid type name
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      type: function (t) {
        if (t == null) {
          return query.has_child.type;
        }
    
        query.has_child.type = t;
        return this;
      },

      /**
            Sets the scope of the query.  A scope allows to run facets on the 
            same scope name that will work against the child documents. 

            @deprecated since elasticsearch 0.90
            @member ejs.HasChildQuery
            @param {String} s The scope name as a string.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      scope: function (s) {
        return this;
      },

      /**
            Sets the scoring method.  Valid values are:
            
            none - the default, no scoring
            max - the highest score of all matched child documents is used
            sum - the sum the all the matched child documents is used
            avg - the average of all matched child documents is used

            @deprecated since elasticsearch 0.90.1, use scoreMode
            
            @member ejs.HasChildQuery
            @param {String} s The score type as a string.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      scoreType: function (s) {
        if (s == null) {
          return query.has_child.score_type;
        }
    
        s = s.toLowerCase();
        if (s === 'none' || s === 'max' || s === 'sum' || s === 'avg') {
          query.has_child.score_type = s;
        }
        
        return this;
      },
      
      /**
            Sets the scoring method.  Valid values are:
            
            none - the default, no scoring
            max - the highest score of all matched child documents is used
            sum - the sum the all the matched child documents is used
            avg - the average of all matched child documents is used

            @member ejs.HasChildQuery
            @param {String} s The score type as a string.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      scoreMode: function (s) {
        if (s == null) {
          return query.has_child.score_mode;
        }
    
        s = s.toLowerCase();
        if (s === 'none' || s === 'max' || s === 'sum' || s === 'avg') {
          query.has_child.score_mode = s;
        }
        
        return this;
      },
      
      /**
            Sets the cutoff value to short circuit processing.

            @member ejs.HasChildQuery
            @param {Integer} cutoff A positive <code>integer</code> value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      shortCircuitCutoff: function (cutoff) {
        if (cutoff == null) {
          return query.has_child.short_circuit_cutoff;
        }

        query.has_child.short_circuit_cutoff = cutoff;
        return this;
      }
      
    });
  };

  /**
    @class
    <p>The has_parent query works the same as the has_parent filter, by 
    automatically wrapping the filter with a constant_score. Results in 
    child documents that have parent docs matching the query being returned.</p>

    @name ejs.HasParentQuery
    @ejs query
    @borrows ejs.QueryMixin.boost as boost
    @borrows ejs.QueryMixin._type as _type
    @borrows ejs.QueryMixin.toJSON as toJSON

    @desc
    Returns results that have parent documents matching the query.

    @param {Object} qry A valid query object.
    @param {String} parentType The child type
    */
  ejs.HasParentQuery = function (qry, parentType) {

    if (!isQuery(qry)) {
      throw new TypeError('Argument must be a Query');
    }
    
    var 
      _common = ejs.QueryMixin('has_parent'),
      query = _common.toJSON();
    
    query.has_parent.query = qry.toJSON();
    query.has_parent.parent_type = parentType;

    return extend(_common, {

      /**
            Sets the query

            @member ejs.HasParentQuery
            @param {Object} q A valid Query object
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      query: function (q) {
        if (q == null) {
          return query.has_parent.query;
        }
  
        if (!isQuery(q)) {
          throw new TypeError('Argument must be a Query');
        }
        
        query.has_parent.query = q.toJSON();
        return this;
      },

      /**
            Sets the child document type to search against

            @member ejs.HasParentQuery
            @param {String} t A valid type name
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      parentType: function (t) {
        if (t == null) {
          return query.has_parent.parent_type;
        }
  
        query.has_parent.parent_type = t;
        return this;
      },

      /**
            Sets the scope of the query.  A scope allows to run facets on the 
            same scope name that will work against the parent documents. 

            @deprecated since elasticsearch 0.90
            @member ejs.HasParentQuery
            @param {String} s The scope name as a string.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      scope: function (s) {
        return this;
      },

      /**
            Sets the scoring method.  Valid values are:
            
            none - the default, no scoring
            score - the score of the parent is used in all child documents.

            @deprecated since elasticsearch 0.90.1 use scoreMode
            
            @member ejs.HasParentQuery
            @param {String} s The score type as a string.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      scoreType: function (s) {
        if (s == null) {
          return query.has_parent.score_type;
        }
    
        s = s.toLowerCase();
        if (s === 'none' || s === 'score') {
          query.has_parent.score_type = s;
        }
        
        return this;
      },
      
      /**
            Sets the scoring method.  Valid values are:
            
            none - the default, no scoring
            score - the score of the parent is used in all child documents.
            
            @member ejs.HasParentQuery
            @param {String} s The score type as a string.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      scoreMode: function (s) {
        if (s == null) {
          return query.has_parent.score_mode;
        }
    
        s = s.toLowerCase();
        if (s === 'none' || s === 'score') {
          query.has_parent.score_mode = s;
        }
        
        return this;
      }
      
    });
  };

  /**
    @class
    <p>Filters documents that only have the provided ids. Note, this filter 
    does not require the _id field to be indexed since it works using the 
    _uid field.</p>

    @name ejs.IdsQuery
    @ejs query
    @borrows ejs.QueryMixin.boost as boost
    @borrows ejs.QueryMixin._type as _type
    @borrows ejs.QueryMixin.toJSON as toJSON

    @desc
    Matches documents with the specified id(s).

    @param {(String|String[])} ids A single document id or a list of document ids.
    */
  ejs.IdsQuery = function (ids) {

    var
      _common = ejs.QueryMixin('ids'),
      query = _common.toJSON();
    
    if (isString(ids)) {
      query.ids.values = [ids];
    } else if (isArray(ids)) {
      query.ids.values = ids;
    } else {
      throw new TypeError('Argument must be string or array');
    }

    return extend(_common, {

      /**
            Sets the values array or adds a new value. if val is a string, it
            is added to the list of existing document ids.  If val is an
            array it is set as the document values and replaces any existing values.

            @member ejs.IdsQuery
            @param {(String|String[])} val An single document id or an array of document ids.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      values: function (val) {
        if (val == null) {
          return query.ids.values;
        }
    
        if (isString(val)) {
          query.ids.values.push(val);
        } else if (isArray(val)) {
          query.ids.values = val;
        } else {
          throw new TypeError('Argument must be string or array');
        }
        
        return this;
      },

      /**
            Sets the type as a single type or an array of types.  If type is a
            string, it is added to the list of existing types.  If type is an
            array, it is set as the types and overwrites an existing types. This
            parameter is optional.

            @member ejs.IdsQuery
            @param {(String|String[])} type A type or a list of types
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      type: function (type) {
        if (query.ids.type == null) {
          query.ids.type = [];
        }
        
        if (type == null) {
          return query.ids.type;
        }
        
        if (isString(type)) {
          query.ids.type.push(type);
        } else if (isArray(type)) {
          query.ids.type = type;
        } else {
          throw new TypeError('Argument must be string or array');
        }
        
        return this;
      }
      
    });
  };

  /**
    @class
    <p>The indices query can be used when executed across multiple indices, 
    allowing to have a query that executes only when executed on an index that 
    matches a specific list of indices, and another query that executes when it 
    is executed on an index that does not match the listed indices.</p>

    @name ejs.IndicesQuery
    @ejs query
    @borrows ejs.QueryMixin.boost as boost
    @borrows ejs.QueryMixin._type as _type
    @borrows ejs.QueryMixin.toJSON as toJSON

    @desc
    A configurable query that is dependent on the index name.

    @param {Query} qry A valid query object.
    @param {(String|String[])} indices a single index name or an array of index 
      names.
    */
  ejs.IndicesQuery = function (qry, indices) {

    if (!isQuery(qry)) {
      throw new TypeError('Argument must be a Query');
    }
    
    var 
      _common = ejs.QueryMixin('indices'),
      query = _common.toJSON();
    
    query.indices.query = qry.toJSON();

    if (isString(indices)) {
      query.indices.indices = [indices];
    } else if (isArray(indices)) {
      query.indices.indices = indices;
    } else {
      throw new TypeError('Argument must be a string or array');
    }
  
    return extend(_common, {

      /**
            Sets the indicies the query should match.  When passed a string,
            the index name is added to the current list of indices.  When passed
            an array, it overwites all current indices.

            @member ejs.IndicesQuery
            @param {(String|String[])} i A single index name or an array of index names.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      indices: function (i) {
        if (i == null) {
          return query.indices.indices;
        }
  
        if (isString(i)) {
          query.indices.indices.push(i);
        } else if (isArray(i)) {
          query.indices.indices = i;
        } else {
          throw new TypeError('Argument must be a string or array');
        }

        return this;
      },
    
      /**
            Sets the query to be executed against the indices specified.

            @member ejs.IndicesQuery
            @param {Query} q A valid Query object
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      query: function (q) {
        if (q == null) {
          return query.indices.query;
        }
  
        if (!isQuery(q)) {
          throw new TypeError('Argument must be a Query');
        }
        
        query.indices.query = q.toJSON();
        return this;
      },

      /**
            Sets the query to be used on an index that does not match an index
            name in the indices list.  Can also be set to "none" to not match any
            documents or "all" to match all documents.

            @member ejs.IndicesQuery
            @param {(Query|String)} q A valid Query object or "none" or "all"
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      noMatchQuery: function (q) {
        if (q == null) {
          return query.indices.no_match_query;
        }
  
        if (isString(q)) {
          q = q.toLowerCase();
          if (q === 'none' || q === 'all') {
            query.indices.no_match_query = q;
          }
        } else if (isQuery(q)) {
          query.indices.no_match_query = q.toJSON();
        } else {
          throw new TypeError('Argument must be string or Query');
        }
      
        return this;
      }
      
    });
  };

  /**
    @class
    <p>This query can be used to match all the documents
    in a given set of collections and/or types.</p>

    @name ejs.MatchAllQuery
    @ejs query
    @borrows ejs.QueryMixin.boost as boost
    @borrows ejs.QueryMixin._type as _type
    @borrows ejs.QueryMixin.toJSON as toJSON

    @desc
    <p>A query that returns all documents.</p>

     */
  ejs.MatchAllQuery = function () {
    return ejs.QueryMixin('match_all');
  };

  /**
    @class
    A <code>MatchQuery</code> is a type of <code>Query</code> that accepts 
    text/numerics/dates, analyzes it, generates a query based on the
    <code>MatchQuery</code> type.
  
    @name ejs.MatchQuery
    @ejs query
    @borrows ejs.QueryMixin._type as _type
    @borrows ejs.QueryMixin.toJSON as toJSON

    @desc
    A Query that appects text, analyzes it, generates internal query based
    on the MatchQuery type.

    @param {String} field the document field/field to query against
    @param {String} qstr the query string
    */
  ejs.MatchQuery = function (field, qstr) {

    var
      _common = ejs.QueryMixin('match'),
      query = _common.toJSON();
    
    query.match[field] = {
      query: qstr
    };

    return extend(_common, {

      /**
            Sets the query string for the <code>Query</code>.

            @member ejs.MatchQuery
            @param {String} qstr The query string to search for.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      query: function (qstr) {
        if (qstr == null) {
          return query.match[field].query;
        }

        query.match[field].query = qstr;
        return this;
      },

      /**
            Sets the type of the <code>MatchQuery</code>.  Valid values are
            boolean, phrase, and phrase_prefix.

            @member ejs.MatchQuery
            @param {String} type Any of boolean, phrase, phrase_prefix.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      type: function (type) {
        if (type == null) {
          return query.match[field].type;
        }

        type = type.toLowerCase();
        if (type === 'boolean' || type === 'phrase' || type === 'phrase_prefix') {
          query.match[field].type = type;
        }

        return this;
      },

      /**
            Sets the fuzziness value for the <code>Query</code>.

            @member ejs.MatchQuery
            @param {Double} fuzz A <code>double</code> value between 0.0 and 1.0.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      fuzziness: function (fuzz) {
        if (fuzz == null) {
          return query.match[field].fuzziness;
        }

        query.match[field].fuzziness = fuzz;
        return this;
      },

      /**
            Sets the maximum threshold/frequency to be considered a low 
            frequency term in a <code>CommonTermsQuery</code>.  
            Set to a value between 0 and 1.

            @member ejs.MatchQuery
            @param {Number} freq A positive <code>double</code> value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      cutoffFrequency: function (freq) {
        if (freq == null) {
          return query.match[field].cutoff_frequency;
        }

        query.match[field].cutoff_frequency = freq;
        return this;
      },
      
      /**
            Sets the prefix length for a fuzzy prefix <code>MatchQuery</code>.

            @member ejs.MatchQuery
            @param {Integer} l A positive <code>integer</code> length value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      prefixLength: function (l) {
        if (l == null) {
          return query.match[field].prefix_length;
        }

        query.match[field].prefix_length = l;
        return this;
      },

      /**
            Sets the max expansions of a fuzzy <code>MatchQuery</code>.

            @member ejs.MatchQuery
            @param {Integer} e A positive <code>integer</code> value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      maxExpansions: function (e) {
        if (e == null) {
          return query.match[field].max_expansions;
        }

        query.match[field].max_expansions = e;
        return this;
      },

      /**
            Sets default operator of the <code>Query</code>.  Default: or.

            @member ejs.MatchQuery
            @param {String} op Any of "and" or "or", no quote characters.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      operator: function (op) {
        if (op == null) {
          return query.match[field].operator;
        }

        op = op.toLowerCase();
        if (op === 'and' || op === 'or') {
          query.match[field].operator = op;
        }

        return this;
      },

      /**
            Sets the default slop for phrases. If zero, then exact phrase matches
            are required.  Default: 0.

            @member ejs.MatchQuery
            @param {Integer} slop A positive <code>integer</code> value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      slop: function (slop) {
        if (slop == null) {
          return query.match[field].slop;
        }

        query.match[field].slop = slop;
        return this;
      },

      /**
            Sets the analyzer name used to analyze the <code>Query</code> object.

            @member ejs.MatchQuery
            @param {String} analyzer A valid analyzer name.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      analyzer: function (analyzer) {
        if (analyzer == null) {
          return query.match[field].analyzer;
        }

        query.match[field].analyzer = analyzer;
        return this;
      },

      /**
            Sets a percent value controlling how many "should" clauses in the
            resulting <code>Query</code> should match.

            @member ejs.MatchQuery
            @param {Integer} minMatch An <code>integer</code> between 0 and 100.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      minimumShouldMatch: function (minMatch) {
        if (minMatch == null) {
          return query.match[field].minimum_should_match;
        }

        query.match[field].minimum_should_match = minMatch;
        return this;
      },
      
      /**
            Sets rewrite method.  Valid values are: 
            
            constant_score_auto - tries to pick the best constant-score rewrite 
              method based on term and document counts from the query
              
            scoring_boolean - translates each term into boolean should and 
              keeps the scores as computed by the query
              
            constant_score_boolean - same as scoring_boolean, expect no scores
              are computed.
              
            constant_score_filter - first creates a private Filter, by visiting 
              each term in sequence and marking all docs for that term
              
            top_terms_boost_N - first translates each term into boolean should
              and scores are only computed as the boost using the top N
              scoring terms.  Replace N with an integer value.
              
            top_terms_N -   first translates each term into boolean should
                and keeps the scores as computed by the query. Only the top N
                scoring terms are used.  Replace N with an integer value.
            
            Default is constant_score_auto.

            This is an advanced option, use with care.

            @member ejs.MatchQuery
            @param {String} m The rewrite method as a string.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      rewrite: function (m) {
        if (m == null) {
          return query.match[field].rewrite;
        }
        
        m = m.toLowerCase();
        if (m === 'constant_score_auto' || m === 'scoring_boolean' ||
          m === 'constant_score_boolean' || m === 'constant_score_filter' ||
          m.indexOf('top_terms_boost_') === 0 || 
          m.indexOf('top_terms_') === 0) {
            
          query.match[field].rewrite = m;
        }
        
        return this;
      },
      
      /**
            Sets fuzzy rewrite method.  Valid values are: 
            
            constant_score_auto - tries to pick the best constant-score rewrite 
              method based on term and document counts from the query
              
            scoring_boolean - translates each term into boolean should and 
              keeps the scores as computed by the query
              
            constant_score_boolean - same as scoring_boolean, expect no scores
              are computed.
              
            constant_score_filter - first creates a private Filter, by visiting 
              each term in sequence and marking all docs for that term
              
            top_terms_boost_N - first translates each term into boolean should
              and scores are only computed as the boost using the top N
              scoring terms.  Replace N with an integer value.
              
            top_terms_N -   first translates each term into boolean should
                and keeps the scores as computed by the query. Only the top N
                scoring terms are used.  Replace N with an integer value.
            
            Default is constant_score_auto.

            This is an advanced option, use with care.
            
            @member ejs.MatchQuery
            @param {String} m The rewrite method as a string.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      fuzzyRewrite: function (m) {
        if (m == null) {
          return query.match[field].fuzzy_rewrite;
        }

        m = m.toLowerCase();
        if (m === 'constant_score_auto' || m === 'scoring_boolean' ||
          m === 'constant_score_boolean' || m === 'constant_score_filter' ||
          m.indexOf('top_terms_boost_') === 0 || 
          m.indexOf('top_terms_') === 0) {
            
          query.match[field].fuzzy_rewrite = m;
        }
        
        return this;
      },
      
      /**
            Set to false to use classic Levenshtein edit distance in the 
            fuzzy query.

            @member ejs.MatchQuery
            @param {Boolean} trueFalse A boolean value
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      fuzzyTranspositions: function (trueFalse) {
        if (trueFalse == null) {
          return query.match[field].fuzzy_transpositions;
        }

        query.match[field].fuzzy_transpositions = trueFalse;
        return this;
      },

      /**
            Enables lenient parsing of the query string.

            @member ejs.MatchQuery
            @param {Boolean} trueFalse A boolean value
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      lenient: function (trueFalse) {
        if (trueFalse == null) {
          return query.match[field].lenient;
        }

        query.match[field].lenient = trueFalse;
        return this;
      },
    
      /**
            Sets what happens when no terms match.  Valid values are
            "all" or "none".  

            @member ejs.MatchQuery
            @param {String} q A no match action, "all" or "none".
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      zeroTermsQuery: function (q) {
        if (q == null) {
          return query.match[field].zero_terms_query;
        }

        q = q.toLowerCase();
        if (q === 'all' || q === 'none') {
          query.match[field].zero_terms_query = q;
        }
        
        return this;
      },
      
      /**
            Sets the boost value for documents matching the <code>Query</code>.

            @member ejs.MatchQuery
            @param {Number} boost A positive <code>double</code> value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      boost: function (boost) {
        if (boost == null) {
          return query.match[field].boost;
        }

        query.match[field].boost = boost;
        return this;
      },

    });
  };

  /**
    @class
    <p>The more_like_this_field query is the same as the more_like_this query, 
    except it runs against a single field.</p>

    @name ejs.MoreLikeThisFieldQuery
    @ejs query
    @borrows ejs.QueryMixin._type as _type
    @borrows ejs.QueryMixin.toJSON as toJSON

    @desc
    <p>Constructs a query where each documents returned are “like” provided text</p>

    @param {String} field The field to run the query against.
    @param {String} likeText The text to find documents like it.

     */
  ejs.MoreLikeThisFieldQuery = function (field, likeText) {

    var
      _common = ejs.QueryMixin('mlt_field'),
      query = _common.toJSON();

    query.mlt_field[field] = {
      like_text: likeText
    };
  
    return extend(_common, {

      /**
             The field to run the query against.

             @member ejs.MoreLikeThisFieldQuery
             @param {String} f A single field name.
             @returns {Object} returns <code>this</code> so that calls can be chained.
             */
      field: function (f) {
        var oldValue = query.mlt_field[field];
    
        if (f == null) {
          return field;
        }
  
        delete query.mlt_field[field];
        field = f;
        query.mlt_field[f] = oldValue;
  
        return this;
      },

      /**
            The text to find documents like

            @member ejs.MoreLikeThisFieldQuery
            @param {String} s A text string.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      likeText: function (txt) {
        if (txt == null) {
          return query.mlt_field[field].like_text;
        }

        query.mlt_field[field].like_text = txt;
        return this;
      },

      /**
            The percentage of terms to match on (float value). 
            Defaults to 0.3 (30 percent).

            @member ejs.MoreLikeThisFieldQuery
            @param {Double} percent A double value between 0 and 1.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      percentTermsToMatch: function (percent) {
        if (percent == null) {
          return query.mlt_field[field].percent_terms_to_match;
        }

        query.mlt_field[field].percent_terms_to_match = percent;
        return this;
      },

      /**
            The frequency below which terms will be ignored in the source doc. 
            The default frequency is 2.

            @member ejs.MoreLikeThisFieldQuery
            @param {Integer} freq A positive integer value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      minTermFreq: function (freq) {
        if (freq == null) {
          return query.mlt_field[field].min_term_freq;
        }

        query.mlt_field[field].min_term_freq = freq;
        return this;
      },
      
      /**
            The maximum number of query terms that will be included in any 
            generated query. Defaults to 25.

            @member ejs.MoreLikeThisFieldQuery
            @param {Integer} max A positive integer value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      maxQueryTerms: function (max) {
        if (max == null) {
          return query.mlt_field[field].max_query_terms;
        }

        query.mlt_field[field].max_query_terms = max;
        return this;
      },

      /**
            An array of stop words. Any word in this set is considered 
            “uninteresting” and ignored. Even if your Analyzer allows stopwords, 
            you might want to tell the MoreLikeThis code to ignore them, as for 
            the purposes of document similarity it seems reasonable to assume 
            that “a stop word is never interesting”.
        
            @member ejs.MoreLikeThisFieldQuery
            @param {Array} stopWords An array of string stopwords
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      stopWords: function (stopWords) {
        if (stopWords == null) {
          return query.mlt_field[field].stop_words;
        }

        query.mlt_field[field].stop_words = stopWords;
        return this;
      },

      /**
            The frequency at which words will be ignored which do not occur in 
            at least this many docs. Defaults to 5.

            @member ejs.MoreLikeThisFieldQuery
            @param {Integer} min A positive integer value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      minDocFreq: function (min) {
        if (min == null) {
          return query.mlt_field[field].min_doc_freq;
        }

        query.mlt_field[field].min_doc_freq = min;
        return this;
      },

      /**
            The maximum frequency in which words may still appear. Words that 
            appear in more than this many docs will be ignored. 
            Defaults to unbounded.

            @member ejs.MoreLikeThisFieldQuery
            @param {Integer} max A positive integer value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      maxDocFreq: function (max) {
        if (max == null) {
          return query.mlt_field[field].max_doc_freq;
        }

        query.mlt_field[field].max_doc_freq = max;
        return this;
      },

      /**
            The minimum word length below which words will be ignored. 
            Defaults to 0.
        
            @member ejs.MoreLikeThisFieldQuery
            @param {Integer} len A positive integer value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      minWordLen: function (len) {
        if (len == null) {
          return query.mlt_field[field].min_word_len;
        }

        query.mlt_field[field].min_word_len = len;
        return this;
      },

      /**
            The maximum word length above which words will be ignored. 
            Defaults to unbounded (0).
        
            @member ejs.MoreLikeThisFieldQuery
            @param {Integer} len A positive integer value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      maxWordLen: function (len) {
        if (len == null) {
          return query.mlt_field[field].max_word_len;
        }

        query.mlt_field[field].max_word_len = len;
        return this;
      },
          
      /**
            The analyzer that will be used to analyze the text. Defaults to the 
            analyzer associated with the field.

            @member ejs.MoreLikeThisFieldQuery
            @param {String} analyzerName The name of the analyzer.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      analyzer: function (analyzerName) {
        if (analyzerName == null) {
          return query.mlt_field[field].analyzer;
        }

        query.mlt_field[field].analyzer = analyzerName;
        return this;
      },
  
      /**
            Sets the boost factor to use when boosting terms. 
            Defaults to 1.

            @member ejs.MoreLikeThisFieldQuery
            @param {Double} boost A positive <code>double</code> value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      boostTerms: function (boost) {
        if (boost == null) {
          return query.mlt_field[field].boost_terms;
        }

        query.mlt_field[field].boost_terms = boost;
        return this;
      },
      
      /**
            Should the <code>Query</code> fail when an unsupported field
            is specified. Defaults to true.

            @member ejs.MoreLikeThisFieldQuery
            @param {Boolean} trueFalse A boolean value
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      failOnUnsupportedField: function (trueFalse) {
        if (trueFalse == null) {
          return query.mlt_field[field].fail_on_unsupported_field;
        }
  
        query.mlt_field[field].fail_on_unsupported_field = trueFalse;
        return this;
      },
                    
      /**
            Sets the boost value of the <code>Query</code>.

            @member ejs.MoreLikeThisFieldQuery
            @param {Double} boost A positive <code>double</code> value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      boost: function (boost) {
        if (boost == null) {
          return query.mlt_field[field].boost;
        }

        query.mlt_field[field].boost = boost;
        return this;
      }
      
    });
  };

  /**
    @class
    <p>More like this query find documents that are “like” provided text by 
    running it against one or more fields.</p>

    @name ejs.MoreLikeThisQuery
    @ejs query
    @borrows ejs.QueryMixin.boost as boost
    @borrows ejs.QueryMixin._type as _type
    @borrows ejs.QueryMixin.toJSON as toJSON

    @desc
    <p>Constructs a query where each documents returned are “like” provided text</p>

    @param {(String|String[])} fields A single field or array of fields to run against.
    @param {String} likeText The text to find documents like it.
  
     */
  ejs.MoreLikeThisQuery = function (fields, likeText) {

    var 
      _common = ejs.QueryMixin('mlt'),
      query = _common.toJSON();
    
    query.mlt.like_text = likeText;
    query.mlt.fields = [];

    if (isString(fields)) {
      query.mlt.fields.push(fields);
    } else if (isArray(fields)) {
      query.mlt.fields = fields;
    } else {
      throw new TypeError('Argument must be string or array');
    }
    
    return extend(_common, {
  
      /**
             The fields to run the query against.  If you call with a single field,
             it is added to the existing list of fields.  If called with an array
             of field names, it replaces any existing values with the new array.

             @member ejs.MoreLikeThisQuery
             @param {(String|String[])} f A single field name or a list of field names.
             @returns {Object} returns <code>this</code> so that calls can be chained.
             */
      fields: function (f) {
        if (f == null) {
          return query.mlt.fields;
        }
    
        if (isString(f)) {
          query.mlt.fields.push(f);
        } else if (isArray(f)) {
          query.mlt.fields = f;
        } else {
          throw new TypeError('Argument must be a string or array');
        }
    
        return this;
      },
  
      /**
            The text to find documents like

            @member ejs.MoreLikeThisQuery
            @param {String} s A text string.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      likeText: function (txt) {
        if (txt == null) {
          return query.mlt.like_text;
        }
  
        query.mlt.like_text = txt;
        return this;
      },

      /**
            The percentage of terms to match on (float value). 
            Defaults to 0.3 (30 percent).

            @member ejs.MoreLikeThisQuery
            @param {Double} percent A double value between 0 and 1.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      percentTermsToMatch: function (percent) {
        if (percent == null) {
          return query.mlt.percent_terms_to_match;
        }
  
        query.mlt.percent_terms_to_match = percent;
        return this;
      },

      /**
            The frequency below which terms will be ignored in the source doc. 
            The default frequency is 2.

            @member ejs.MoreLikeThisQuery
            @param {Integer} freq A positive integer value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      minTermFreq: function (freq) {
        if (freq == null) {
          return query.mlt.min_term_freq;
        }
  
        query.mlt.min_term_freq = freq;
        return this;
      },
        
      /**
            The maximum number of query terms that will be included in any 
            generated query. Defaults to 25.

            @member ejs.MoreLikeThisQuery
            @param {Integer} max A positive integer value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      maxQueryTerms: function (max) {
        if (max == null) {
          return query.mlt.max_query_terms;
        }
  
        query.mlt.max_query_terms = max;
        return this;
      },

      /**
            An array of stop words. Any word in this set is considered 
            “uninteresting” and ignored. Even if your Analyzer allows stopwords, 
            you might want to tell the MoreLikeThis code to ignore them, as for 
            the purposes of document similarity it seems reasonable to assume 
            that “a stop word is never interesting”.
          
            @member ejs.MoreLikeThisQuery
            @param {Array} stopWords An array of string stopwords
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      stopWords: function (stopWords) {
        if (stopWords == null) {
          return query.mlt.stop_words;
        }
  
        query.mlt.stop_words = stopWords;
        return this;
      },

      /**
            The frequency at which words will be ignored which do not occur in 
            at least this many docs. Defaults to 5.

            @member ejs.MoreLikeThisQuery
            @param {Integer} min A positive integer value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      minDocFreq: function (min) {
        if (min == null) {
          return query.mlt.min_doc_freq;
        }
  
        query.mlt.min_doc_freq = min;
        return this;
      },

      /**
            The maximum frequency in which words may still appear. Words that 
            appear in more than this many docs will be ignored. 
            Defaults to unbounded.

            @member ejs.MoreLikeThisQuery
            @param {Integer} max A positive integer value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      maxDocFreq: function (max) {
        if (max == null) {
          return query.mlt.max_doc_freq;
        }
  
        query.mlt.max_doc_freq = max;
        return this;
      },

      /**
            The minimum word length below which words will be ignored. 
            Defaults to 0.
          
            @member ejs.MoreLikeThisQuery
            @param {Integer} len A positive integer value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      minWordLen: function (len) {
        if (len == null) {
          return query.mlt.min_word_len;
        }
  
        query.mlt.min_word_len = len;
        return this;
      },

      /**
            The maximum word length above which words will be ignored. 
            Defaults to unbounded (0).
          
            @member ejs.MoreLikeThisQuery
            @param {Integer} len A positive integer value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      maxWordLen: function (len) {
        if (len == null) {
          return query.mlt.max_word_len;
        }
  
        query.mlt.max_word_len = len;
        return this;
      },
            
      /**
            The analyzer that will be used to analyze the text. Defaults to the 
            analyzer associated with the field.

            @member ejs.MoreLikeThisQuery
            @param {String} analyzerName The name of the analyzer.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      analyzer: function (analyzerName) {
        if (analyzerName == null) {
          return query.mlt.analyzer;
        }
  
        query.mlt.analyzer = analyzerName;
        return this;
      },
    
      /**
            Sets the boost factor to use when boosting terms. 
            Defaults to 1.

            @member ejs.MoreLikeThisQuery
            @param {Double} boost A positive <code>double</code> value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      boostTerms: function (boost) {
        if (boost == null) {
          return query.mlt.boost_terms;
        }

        query.mlt.boost_terms = boost;
        return this;
      },
         
      /**
            Should the <code>Query</code> fail when an unsupported field
            is specified. Defaults to true.

            @member ejs.MoreLikeThisQuery
            @param {Boolean} trueFalse A boolean value
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      failOnUnsupportedField: function (trueFalse) {
        if (trueFalse == null) {
          return query.mlt.fail_on_unsupported_field;
        }
  
        query.mlt.fail_on_unsupported_field = trueFalse;
        return this;
      }
      
    });
  };

  /**
    @class
    A <code>MultiMatchQuery</code> query builds further on top of the 
    <code>MatchQuery</code> by allowing multiple fields to be specified. 
    The idea here is to allow to more easily build a concise match type query 
    over multiple fields instead of using a relatively more expressive query 
    by using multiple match queries within a bool query.
  
    @name ejs.MultiMatchQuery
    @ejs query
    @borrows ejs.QueryMixin.boost as boost
    @borrows ejs.QueryMixin._type as _type
    @borrows ejs.QueryMixin.toJSON as toJSON

    @desc
    A Query that allow to more easily build a MatchQuery 
    over multiple fields

    @param {(String|String[])} fields the single field or array of fields to search across
    @param {String} qstr the query string
    */
  ejs.MultiMatchQuery = function (fields, qstr) {

    var 
      _common = ejs.QueryMixin('multi_match'),
      query = _common.toJSON();
    
    query.multi_match.query = qstr;
    query.multi_match.fields = [];

    if (isString(fields)) {
      query.multi_match.fields.push(fields);
    } else if (isArray(fields)) {
      query.multi_match.fields = fields;
    } else {
      throw new TypeError('Argument must be string or array');
    }
    
    return extend(_common, {

      /**
            Sets the fields to search across.  If passed a single value it is
            added to the existing list of fields.  If passed an array of 
            values, they overwite all existing values.

            @member ejs.MultiMatchQuery
            @param {(String|String[])} f A single field or list of fields names to 
              search across.
            @returns {Object} returns <code>this</code> so that calls can be 
              chained. Returns {Array} current value if `f` not specified.
            */
      fields: function (f) {
        if (f == null) {
          return query.multi_match.fields;
        }

        if (isString(f)) {
          query.multi_match.fields.push(f);
        } else if (isArray(f)) {
          query.multi_match.fields = f;
        } else {
          throw new TypeError('Argument must be string or array');
        }
        
        return this;
      },

      /**
            Sets whether or not queries against multiple fields should be combined using Lucene's
            <a href="http://lucene.apache.org/java/3_0_0/api/core/org/apache/lucene/search/DisjunctionMaxQuery.html">
            DisjunctionMaxQuery</a>

            @member ejs.MultiMatchQuery
            @param {String} trueFalse A <code>true/false</code> value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      useDisMax: function (trueFalse) {
        if (trueFalse == null) {
          return query.multi_match.use_dis_max;
        }
      
        query.multi_match.use_dis_max = trueFalse;
        return this;
      },

      /**
            The tie breaker value.  The tie breaker capability allows results
            that include the same term in multiple fields to be judged better than
            results that include this term in only the best of those multiple
            fields, without confusing this with the better case of two different
            terms in the multiple fields.  Default: 0.0.

            @member ejs.MultiMatchQuery
            @param {Double} tieBreaker A positive <code>double</code> value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      tieBreaker: function (tieBreaker) {
        if (tieBreaker == null) {
          return query.multi_match.tie_breaker;
        }

        query.multi_match.tie_breaker = tieBreaker;
        return this;
      },

      /**
            Sets the maximum threshold/frequency to be considered a low 
            frequency term in a <code>CommonTermsQuery</code>.  
            Set to a value between 0 and 1.

            @member ejs.MultiMatchQuery
            @param {Number} freq A positive <code>double</code> value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      cutoffFrequency: function (freq) {
        if (freq == null) {
          return query.multi_match.cutoff_frequency;
        }

        query.multi_match.cutoff_frequency = freq;
        return this;
      },
      
      /**
            Sets a percent value controlling how many "should" clauses in the
            resulting <code>Query</code> should match.

            @member ejs.MultiMatchQuery
            @param {Integer} minMatch An <code>integer</code> between 0 and 100.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      minimumShouldMatch: function (minMatch) {
        if (minMatch == null) {
          return query.multi_match.minimum_should_match;
        }

        query.multi_match.minimum_should_match = minMatch;
        return this;
      },
      
      /**
            Sets rewrite method.  Valid values are: 
            
            constant_score_auto - tries to pick the best constant-score rewrite 
              method based on term and document counts from the query
              
            scoring_boolean - translates each term into boolean should and 
              keeps the scores as computed by the query
              
            constant_score_boolean - same as scoring_boolean, expect no scores
              are computed.
              
            constant_score_filter - first creates a private Filter, by visiting 
              each term in sequence and marking all docs for that term
              
            top_terms_boost_N - first translates each term into boolean should
              and scores are only computed as the boost using the top N
              scoring terms.  Replace N with an integer value.
              
            top_terms_N -   first translates each term into boolean should
                and keeps the scores as computed by the query. Only the top N
                scoring terms are used.  Replace N with an integer value.
            
            Default is constant_score_auto.

            This is an advanced option, use with care.

            @member ejs.MultiMatchQuery
            @param {String} m The rewrite method as a string.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      rewrite: function (m) {
        if (m == null) {
          return query.multi_match.rewrite;
        }
        
        m = m.toLowerCase();
        if (m === 'constant_score_auto' || m === 'scoring_boolean' ||
          m === 'constant_score_boolean' || m === 'constant_score_filter' ||
          m.indexOf('top_terms_boost_') === 0 || 
          m.indexOf('top_terms_') === 0) {
            
          query.multi_match.rewrite = m;
        }
        
        return this;
      },
      
      /**
            Sets fuzzy rewrite method.  Valid values are: 
            
            constant_score_auto - tries to pick the best constant-score rewrite 
              method based on term and document counts from the query
              
            scoring_boolean - translates each term into boolean should and 
              keeps the scores as computed by the query
              
            constant_score_boolean - same as scoring_boolean, expect no scores
              are computed.
              
            constant_score_filter - first creates a private Filter, by visiting 
              each term in sequence and marking all docs for that term
              
            top_terms_boost_N - first translates each term into boolean should
              and scores are only computed as the boost using the top N
              scoring terms.  Replace N with an integer value.
              
            top_terms_N -   first translates each term into boolean should
                and keeps the scores as computed by the query. Only the top N
                scoring terms are used.  Replace N with an integer value.
            
            Default is constant_score_auto.

            This is an advanced option, use with care.
            
            @member ejs.MultiMatchQuery
            @param {String} m The rewrite method as a string.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      fuzzyRewrite: function (m) {
        if (m == null) {
          return query.multi_match.fuzzy_rewrite;
        }

        m = m.toLowerCase();
        if (m === 'constant_score_auto' || m === 'scoring_boolean' ||
          m === 'constant_score_boolean' || m === 'constant_score_filter' ||
          m.indexOf('top_terms_boost_') === 0 || 
          m.indexOf('top_terms_') === 0) {
            
          query.multi_match.fuzzy_rewrite = m;
        }
        
        return this;
      },

      /**
            Enables lenient parsing of the query string.

            @member ejs.MultiMatchQuery
            @param {Boolean} trueFalse A boolean value
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      lenient: function (trueFalse) {
        if (trueFalse == null) {
          return query.multi_match.lenient;
        }

        query.multi_match.lenient = trueFalse;
        return this;
      },

      /**
            Sets the query string for the <code>Query</code>.

            @member ejs.MultiMatchQuery
            @param {String} qstr The query string to search for.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      query: function (qstr) {
        if (qstr == null) {
          return query.multi_match.query;
        }

        query.multi_match.query = qstr;
        return this;
      },

      /**
            Sets the type of the <code>MultiMatchQuery</code>.  Valid values are
            boolean, phrase, and phrase_prefix or phrasePrefix.

            @member ejs.MultiMatchQuery
            @param {String} type Any of boolean, phrase, phrase_prefix or phrasePrefix.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      type: function (type) {
        if (type == null) {
          return query.multi_match.type;
        }

        type = type.toLowerCase();
        if (type === 'boolean' || type === 'phrase' || type === 'phrase_prefix') {
          query.multi_match.type = type;
        }

        return this;
      },

      /**
            Sets the fuzziness value for the <code>Query</code>.

            @member ejs.MultiMatchQuery
            @param {Double} fuzz A <code>double</code> value between 0.0 and 1.0.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      fuzziness: function (fuzz) {
        if (fuzz == null) {
          return query.multi_match.fuzziness;
        }

        query.multi_match.fuzziness = fuzz;
        return this;
      },

      /**
            Sets the prefix length for a fuzzy prefix <code>Query</code>.

            @member ejs.MultiMatchQuery
            @param {Integer} l A positive <code>integer</code> length value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      prefixLength: function (l) {
        if (l == null) {
          return query.multi_match.prefix_length;
        }

        query.multi_match.prefix_length = l;
        return this;
      },

      /**
            Sets the max expansions of a fuzzy <code>Query</code>.

            @member ejs.MultiMatchQuery
            @param {Integer} e A positive <code>integer</code> value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      maxExpansions: function (e) {
        if (e == null) {
          return query.multi_match.max_expansions;
        }

        query.multi_match.max_expansions = e;
        return this;
      },

      /**
            Sets default operator of the <code>Query</code>.  Default: or.

            @member ejs.MultiMatchQuery
            @param {String} op Any of "and" or "or", no quote characters.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      operator: function (op) {
        if (op == null) {
          return query.multi_match.operator;
        }

        op = op.toLowerCase();
        if (op === 'and' || op === 'or') {
          query.multi_match.operator = op;
        }

        return this;
      },

      /**
            Sets the default slop for phrases. If zero, then exact phrase matches
            are required.  Default: 0.

            @member ejs.MultiMatchQuery
            @param {Integer} slop A positive <code>integer</code> value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      slop: function (slop) {
        if (slop == null) {
          return query.multi_match.slop;
        }

        query.multi_match.slop = slop;
        return this;
      },

      /**
            Sets the analyzer name used to analyze the <code>Query</code> object.

            @member ejs.MultiMatchQuery
            @param {String} analyzer A valid analyzer name.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      analyzer: function (analyzer) {
        if (analyzer == null) {
          return query.multi_match.analyzer;
        }

        query.multi_match.analyzer = analyzer;
        return this;
      },

      /**
            Sets what happens when no terms match.  Valid values are
            "all" or "none".  

            @member ejs.MultiMatchQuery
            @param {String} q A no match action, "all" or "none".
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      zeroTermsQuery: function (q) {
        if (q == null) {
          return query.multi_match.zero_terms_query;
        }

        q = q.toLowerCase();
        if (q === 'all' || q === 'none') {
          query.multi_match.zero_terms_query = q;
        }
        
        return this;
      }

    });
  };

  /**
    @class
    <p>Nested queries allow you to search against content within objects that are
       embedded inside of other objects. It is similar to <code>XPath</code> expressions
       in <code>XML</code> both conceptually and syntactically.</p>

    <p>The query is executed against the nested objects / docs as if they were 
    indexed as separate docs and resulting in the rootparent doc (or parent 
    nested mapping).</p>
    
    @name ejs.NestedQuery
    @ejs query
    @borrows ejs.QueryMixin.boost as boost
    @borrows ejs.QueryMixin._type as _type
    @borrows ejs.QueryMixin.toJSON as toJSON

    @desc
    <p>Constructs a query that is capable of executing a search against objects
       nested within a document.</p>

    @param {String} path The nested object path.

     */
  ejs.NestedQuery = function (path) {

    var 
      _common = ejs.QueryMixin('nested'),
      query = _common.toJSON();
    
    query.nested.path = path;

    return extend(_common, {
      
      /**
             Sets the root context for the nested query.
             
             @member ejs.NestedQuery
             @param {String} path The path defining the root context for the nested query.
             @returns {Object} returns <code>this</code> so that calls can be chained.
             */
      path: function (path) {
        if (path == null) {
          return query.nested.path;
        }
      
        query.nested.path = path;
        return this;
      },

      /**
             Sets the nested query to be executed.
             
             @member ejs.NestedQuery
             @param {Object} oQuery A valid Query object
             @returns {Object} returns <code>this</code> so that calls can be chained.
             */
      query: function (oQuery) {
        if (oQuery == null) {
          return query.nested.query;
        }
    
        if (!isQuery(oQuery)) {
          throw new TypeError('Argument must be a Query');
        }
        
        query.nested.query = oQuery.toJSON();
        return this;
      },


      /**
             Sets the nested filter to be executed.
             
             @member ejs.NestedQuery
             @param {Object} oFilter A valid Filter object
             @returns {Object} returns <code>this</code> so that calls can be chained.
             */
      filter: function (oFilter) {
        if (oFilter == null) {
          return query.nested.filter;
        }
    
        if (!isFilter(oFilter)) {
          throw new TypeError('Argument must be a Filter');
        }
        
        query.nested.filter = oFilter.toJSON();
        return this;
      },

      /**
             Sets how the inner (nested) matches affect scoring on the parent document.
             
             @member ejs.NestedQuery
             @param {String} mode The mode of scoring to be used for nested matches.
                             Options are avg, total, max, none - defaults to avg
             @returns {Object} returns <code>this</code> so that calls can be chained.
             */
      scoreMode: function (mode) {
        if (mode == null) {
          return query.nested.score_mode;
        }
      
        mode = mode.toLowerCase();
        if (mode === 'avg' || mode === 'total' || mode === 'max' || 
          mode === 'none' || mode === 'sum') {
            
          query.nested.score_mode = mode;
        }
        
        return this;
      },

      /**
            Sets the scope of the query.  A scope allows to run facets on the 
            same scope name that will work against the nested documents. 

            @deprecated since elasticsearch 0.90
            @member ejs.NestedQuery
            @param {String} s The scope name as a string.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      scope: function (s) {
        return this;
      }
      
    });
  };

  /**
    @class
    <p>Matches documents that have fields containing terms with a specified 
    prefix (not analyzed). The prefix query maps to Lucene PrefixQuery.</p>

    @name ejs.PrefixQuery
    @ejs query
    @borrows ejs.QueryMixin._type as _type
    @borrows ejs.QueryMixin.toJSON as toJSON

    @desc
    Matches documents containing the specified un-analyzed prefix.

    @param {String} field A valid field name.
    @param {String} value A string prefix.
    */
  ejs.PrefixQuery = function (field, value) {

    var
      _common = ejs.QueryMixin('prefix'),
      query = _common.toJSON();

    query.prefix[field] = {
      value: value
    };
  
    return extend(_common, {

      /**
             The field to run the query against.

             @member ejs.PrefixQuery
             @param {String} f A single field name.
             @returns {Object} returns <code>this</code> so that calls can be chained.
             */
      field: function (f) {
        var oldValue = query.prefix[field];
  
        if (f == null) {
          return field;
        }

        delete query.prefix[field];
        field = f;
        query.prefix[f] = oldValue;

        return this;
      },

      /**
            The prefix value.

            @member ejs.PrefixQuery
            @param {String} p A string prefix
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      value: function (p) {
        if (p == null) {
          return query.prefix[field].value;
        }

        query.prefix[field].value = p;
        return this;
      },

      /**
            Sets rewrite method.  Valid values are: 
            
            constant_score_auto - tries to pick the best constant-score rewrite 
              method based on term and document counts from the query
              
            scoring_boolean - translates each term into boolean should and 
              keeps the scores as computed by the query
              
            constant_score_boolean - same as scoring_boolean, expect no scores
              are computed.
              
            constant_score_filter - first creates a private Filter, by visiting 
              each term in sequence and marking all docs for that term
              
            top_terms_boost_N - first translates each term into boolean should
              and scores are only computed as the boost using the top N
              scoring terms.  Replace N with an integer value.
              
            top_terms_N -   first translates each term into boolean should
                and keeps the scores as computed by the query. Only the top N
                scoring terms are used.  Replace N with an integer value.
            
            Default is constant_score_auto.

            This is an advanced option, use with care.

            @member ejs.PrefixQuery
            @param {String} m The rewrite method as a string.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      rewrite: function (m) {
        if (m == null) {
          return query.prefix[field].rewrite;
        }
        
        m = m.toLowerCase();
        if (m === 'constant_score_auto' || m === 'scoring_boolean' ||
          m === 'constant_score_boolean' || m === 'constant_score_filter' ||
          m.indexOf('top_terms_boost_') === 0 || 
          m.indexOf('top_terms_') === 0) {
            
          query.prefix[field].rewrite = m;
        }
        
        return this;
      },
      
      /**
            Sets the boost value of the <code>Query</code>.

            @member ejs.PrefixQuery
            @param {Double} boost A positive <code>double</code> value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      boost: function (boost) {
        if (boost == null) {
          return query.prefix[field].boost;
        }

        query.prefix[field].boost = boost;
        return this;
      }
      
    });
  };

  /**
    @class
    <p>A query that is parsed using Lucene's default query parser. Although Lucene provides the
    ability to create your own queries through its API, it also provides a rich query language
    through the Query Parser, a lexer which interprets a string into a Lucene Query.</p>

    </p>See the Lucene <a href="http://lucene.apache.org/java/2_9_1/queryparsersyntax.html">Query Parser Syntax</a>
    for more information.</p>

    @name ejs.QueryStringQuery
    @ejs query
    @borrows ejs.QueryMixin.boost as boost
    @borrows ejs.QueryMixin._type as _type
    @borrows ejs.QueryMixin.toJSON as toJSON

    @desc
    A query that is parsed using Lucene's default query parser.

    @param {String} qstr A valid Lucene query string.
    */
  ejs.QueryStringQuery = function (qstr) {

    var
      _common = ejs.QueryMixin('query_string'),
      query = _common.toJSON();

    query.query_string.query = qstr;

    return extend(_common, {

      /**
            Sets the query string on this <code>Query</code> object.

            @member ejs.QueryStringQuery
            @param {String} qstr A valid Lucene query string.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      query: function (qstr) {
        if (qstr == null) {
          return query.query_string.query;
        }

        query.query_string.query = qstr;
        return this;
      },

      /**
            Sets the default field/property this query should execute against.

            @member ejs.QueryStringQuery
            @param {String} fieldName The name of document field/property.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      defaultField: function (fieldName) {
        if (fieldName == null) {
          return query.query_string.default_field;
        }
      
        query.query_string.default_field = fieldName;
        return this;
      },

      /**
            A set of fields/properties this query should execute against.  
            Pass a single value to add to the existing list of fields and 
            pass an array to overwrite all existing fields.  For each field, 
            you can apply a field specific boost by appending a ^boost to the 
            field name.  For example, title^10, to give the title field a
            boost of 10.

            @member ejs.QueryStringQuery
            @param {Array} fieldNames A list of document fields/properties.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      fields: function (fieldNames) {
        if (query.query_string.fields == null) {
          query.query_string.fields = [];
        }
        
        if (fieldNames == null) {
          return query.query_string.fields;
        }
      
        if (isString(fieldNames)) {
          query.query_string.fields.push(fieldNames);
        } else if (isArray(fieldNames)) {
          query.query_string.fields = fieldNames;
        } else {
          throw new TypeError('Argument must be a string or array');
        }
        
        return this;
      },

      /**
            Sets whether or not queries against multiple fields should be combined using Lucene's
            <a href="http://lucene.apache.org/java/3_0_0/api/core/org/apache/lucene/search/DisjunctionMaxQuery.html">
            DisjunctionMaxQuery</a>

            @member ejs.QueryStringQuery
            @param {String} trueFalse A <code>true/false</code> value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      useDisMax: function (trueFalse) {
        if (trueFalse == null) {
          return query.query_string.use_dis_max;
        }
      
        query.query_string.use_dis_max = trueFalse;
        return this;
      },

      /**
            Set the default <em>Boolean</em> operator. This operator is used to join individual query
            terms when no operator is explicity used in the query string (i.e., <code>this AND that</code>).
            Defaults to <code>OR</code>.

            @member ejs.QueryStringQuery
            @param {String} op The operator to use, AND or OR.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      defaultOperator: function (op) {
        if (op == null) {
          return query.query_string.default_operator;
        }
      
        op = op.toUpperCase();
        if (op === 'AND' || op === 'OR') {
          query.query_string.default_operator = op;
        }
        
        return this;
      },

      /**
            Sets the analyzer name used to analyze the <code>Query</code> object.

            @member ejs.QueryStringQuery
            @param {String} analyzer A valid analyzer name.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      analyzer: function (analyzer) {
        if (analyzer == null) {
          return query.query_string.analyzer;
        }

        query.query_string.analyzer = analyzer;
        return this;
      },

      /**
            Sets the quote analyzer name used to analyze the <code>query</code>
            when in quoted text.

            @member ejs.QueryStringQuery
            @param {String} analyzer A valid analyzer name.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      quoteAnalyzer: function (analyzer) {
        if (analyzer == null) {
          return query.query_string.quote_analyzer;
        }

        query.query_string.quote_analyzer = analyzer;
        return this;
      },
      
      /**
            Sets whether or not wildcard characters (* and ?) are allowed as the
            first character of the <code>Query</code>.  Default: true.

            @member ejs.QueryStringQuery
            @param {Boolean} trueFalse A <code>true/false</code> value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      allowLeadingWildcard: function (trueFalse) {
        if (trueFalse == null) {
          return query.query_string.allow_leading_wildcard;
        }

        query.query_string.allow_leading_wildcard = trueFalse;
        return this;
      },

      /**
            Sets whether or not terms from wildcard, prefix, fuzzy, and
            range queries should automatically be lowercased in the <code>Query</code>
            since they are not analyzed.  Default: true.

            @member ejs.QueryStringQuery
            @param {Boolean} trueFalse A <code>true/false</code> value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      lowercaseExpandedTerms: function (trueFalse) {
        if (trueFalse == null) {
          return query.query_string.lowercase_expanded_terms;
        }

        query.query_string.lowercase_expanded_terms = trueFalse;
        return this;
      },

      /**
            Sets whether or not position increments will be used in the
            <code>Query</code>. Default: true.

            @member ejs.QueryStringQuery
            @param {Boolean} trueFalse A <code>true/false</code> value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      enablePositionIncrements: function (trueFalse) {
        if (trueFalse == null) {
          return query.query_string.enable_position_increments;
        }

        query.query_string.enable_position_increments = trueFalse;
        return this;
      },


      /**
            Sets the prefix length for fuzzy queries.  Default: 0.

            @member ejs.QueryStringQuery
            @param {Integer} fuzzLen A positive <code>integer</code> value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      fuzzyPrefixLength: function (fuzzLen) {
        if (fuzzLen == null) {
          return query.query_string.fuzzy_prefix_length;
        }

        query.query_string.fuzzy_prefix_length = fuzzLen;
        return this;
      },

      /**
            Set the minimum similarity for fuzzy queries.  Default: 0.5.

            @member ejs.QueryStringQuery
            @param {Double} minSim A <code>double</code> value between 0 and 1.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      fuzzyMinSim: function (minSim) {
        if (minSim == null) {
          return query.query_string.fuzzy_min_sim;
        }

        query.query_string.fuzzy_min_sim = minSim;
        return this;
      },

      /**
            Sets the default slop for phrases. If zero, then exact phrase matches
            are required.  Default: 0.

            @member ejs.QueryStringQuery
            @param {Integer} slop A positive <code>integer</code> value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      phraseSlop: function (slop) {
        if (slop == null) {
          return query.query_string.phrase_slop;
        }

        query.query_string.phrase_slop = slop;
        return this;
      },

      /**
            Sets whether or not we should attempt to analyzed wilcard terms in the
            <code>Query</code>. By default, wildcard terms are not analyzed.
            Analysis of wildcard characters is not perfect.  Default: false.

            @member ejs.QueryStringQuery
            @param {Boolean} trueFalse A <code>true/false</code> value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      analyzeWildcard: function (trueFalse) {
        if (trueFalse == null) {
          return query.query_string.analyze_wildcard;
        }

        query.query_string.analyze_wildcard = trueFalse;
        return this;
      },

      /**
            Sets whether or not we should auto generate phrase queries *if* the
            analyzer returns more than one term. Default: false.

            @member ejs.QueryStringQuery
            @param {Boolean} trueFalse A <code>true/false</code> value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      autoGeneratePhraseQueries: function (trueFalse) {
        if (trueFalse == null) {
          return query.query_string.auto_generate_phrase_queries;
        }

        query.query_string.auto_generate_phrase_queries = trueFalse;
        return this;
      },

      /**
            Sets a percent value controlling how many "should" clauses in the
            resulting <code>Query</code> should match.

            @member ejs.QueryStringQuery
            @param {Integer} minMatch An <code>integer</code> between 0 and 100.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      minimumShouldMatch: function (minMatch) {
        if (minMatch == null) {
          return query.query_string.minimum_should_match;
        }

        query.query_string.minimum_should_match = minMatch;
        return this;
      },

      /**
            Sets the tie breaker value for a <code>Query</code> using
            <code>DisMax</code>.  The tie breaker capability allows results
            that include the same term in multiple fields to be judged better than
            results that include this term in only the best of those multiple
            fields, without confusing this with the better case of two different
            terms in the multiple fields.  Default: 0.0.

            @member ejs.QueryStringQuery
            @param {Double} tieBreaker A positive <code>double</code> value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      tieBreaker: function (tieBreaker) {
        if (tieBreaker == null) {
          return query.query_string.tie_breaker;
        }

        query.query_string.tie_breaker = tieBreaker;
        return this;
      },

      /**
            If they query string should be escaped or not.

            @member ejs.QueryStringQuery
            @param {Boolean} trueFalse A <code>true/false</code> value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      escape: function (trueFalse) {
        if (trueFalse == null) {
          return query.query_string.escape;
        }

        query.query_string.escape = trueFalse;
        return this;
      },

      /**
            Sets the max number of term expansions for fuzzy queries.  

            @member ejs.QueryStringQuery
            @param {Integer} max A positive <code>integer</code> value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      fuzzyMaxExpansions: function (max) {
        if (max == null) {
          return query.query_string.fuzzy_max_expansions;
        }

        query.query_string.fuzzy_max_expansions = max;
        return this;
      },

      /**
            Sets fuzzy rewrite method.  Valid values are: 
            
            constant_score_auto - tries to pick the best constant-score rewrite 
              method based on term and document counts from the query
              
            scoring_boolean - translates each term into boolean should and 
              keeps the scores as computed by the query
              
            constant_score_boolean - same as scoring_boolean, expect no scores
              are computed.
              
            constant_score_filter - first creates a private Filter, by visiting 
              each term in sequence and marking all docs for that term
              
            top_terms_boost_N - first translates each term into boolean should
              and scores are only computed as the boost using the top N
              scoring terms.  Replace N with an integer value.
              
            top_terms_N -   first translates each term into boolean should
                and keeps the scores as computed by the query. Only the top N
                scoring terms are used.  Replace N with an integer value.
            
            Default is constant_score_auto.

            This is an advanced option, use with care.
            
            @member ejs.QueryStringQuery
            @param {String} m The rewrite method as a string.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      fuzzyRewrite: function (m) {
        if (m == null) {
          return query.query_string.fuzzy_rewrite;
        }

        m = m.toLowerCase();
        if (m === 'constant_score_auto' || m === 'scoring_boolean' ||
          m === 'constant_score_boolean' || m === 'constant_score_filter' ||
          m.indexOf('top_terms_boost_') === 0 || 
          m.indexOf('top_terms_') === 0) {
            
          query.query_string.fuzzy_rewrite = m;
        }
        
        return this;
      },

      /**
            Sets rewrite method.  Valid values are: 
            
            constant_score_auto - tries to pick the best constant-score rewrite 
              method based on term and document counts from the query
              
            scoring_boolean - translates each term into boolean should and 
              keeps the scores as computed by the query
              
            constant_score_boolean - same as scoring_boolean, expect no scores
              are computed.
              
            constant_score_filter - first creates a private Filter, by visiting 
              each term in sequence and marking all docs for that term
              
            top_terms_boost_N - first translates each term into boolean should
              and scores are only computed as the boost using the top N
              scoring terms.  Replace N with an integer value.
              
            top_terms_N -   first translates each term into boolean should
                and keeps the scores as computed by the query. Only the top N
                scoring terms are used.  Replace N with an integer value.
            
            Default is constant_score_auto.

            This is an advanced option, use with care.

            @member ejs.QueryStringQuery
            @param {String} m The rewrite method as a string.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      rewrite: function (m) {
        if (m == null) {
          return query.query_string.rewrite;
        }
        
        m = m.toLowerCase();
        if (m === 'constant_score_auto' || m === 'scoring_boolean' ||
          m === 'constant_score_boolean' || m === 'constant_score_filter' ||
          m.indexOf('top_terms_boost_') === 0 || 
          m.indexOf('top_terms_') === 0) {
            
          query.query_string.rewrite = m;
        }
        
        return this;
      },

      /**
            Sets the suffix to automatically add to the field name when 
            performing a quoted search.

            @member ejs.QueryStringQuery
            @param {String} s The suffix as a string.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      quoteFieldSuffix: function (s) {
        if (s == null) {
          return query.query_string.quote_field_suffix;
        }

        query.query_string.quote_field_suffix = s;
        return this;
      },
      
      /**
            Enables lenient parsing of the query string.

            @member ejs.QueryStringQuery
            @param {Boolean} trueFalse A boolean value
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      lenient: function (trueFalse) {
        if (trueFalse == null) {
          return query.query_string.lenient;
        }

        query.query_string.lenient = trueFalse;
        return this;
      }
      
    });
  };

  /**
    @class
    <p>Matches documents with fields that have terms within a certain range. 
    The type of the Lucene query depends on the field type, for string fields, 
    the TermRangeQuery, while for number/date fields, the query is a 
    NumericRangeQuery.</p>

    @name ejs.RangeQuery
    @ejs query
    @borrows ejs.QueryMixin._type as _type
    @borrows ejs.QueryMixin.toJSON as toJSON

    @desc
    Matches documents with fields that have terms within a certain range.

    @param {String} field A valid field name.
    */
  ejs.RangeQuery = function (field) {

    var
      _common = ejs.QueryMixin('range'),
      query = _common.toJSON();

    query.range[field] = {};

    return extend(_common, {

      /**
             The field to run the query against.

             @member ejs.RangeQuery
             @param {String} f A single field name.
             @returns {Object} returns <code>this</code> so that calls can be chained.
             */
      field: function (f) {
        var oldValue = query.range[field];

        if (f == null) {
          return field;
        }

        delete query.range[field];
        field = f;
        query.range[f] = oldValue;

        return this;
      },

      /**
            The lower bound. Defaults to start from the first.

            @member ejs.RangeQuery
            @param {*} f the lower bound value, type depends on field type
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      from: function (f) {
        if (f == null) {
          return query.range[field].from;
        }

        query.range[field].from = f;
        return this;
      },

      /**
            The upper bound. Defaults to unbounded.

            @member ejs.RangeQuery
            @param {*} t the upper bound value, type depends on field type
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      to: function (t) {
        if (t == null) {
          return query.range[field].to;
        }

        query.range[field].to = t;
        return this;
      },

      /**
            Should the first from (if set) be inclusive or not. 
            Defaults to true

            @member ejs.RangeQuery
            @param {Boolean} trueFalse true to include, false to exclude 
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      includeLower: function (trueFalse) {
        if (trueFalse == null) {
          return query.range[field].include_lower;
        }

        query.range[field].include_lower = trueFalse;
        return this;
      },

      /**
            Should the last to (if set) be inclusive or not. Defaults to true.

            @member ejs.RangeQuery
            @param {Boolean} trueFalse true to include, false to exclude 
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      includeUpper: function (trueFalse) {
        if (trueFalse == null) {
          return query.range[field].include_upper;
        }

        query.range[field].include_upper = trueFalse;
        return this;
      },

      /**
            Greater than value.  Same as setting from to the value, and 
            include_lower to false,

            @member ejs.RangeQuery
            @param {*} val the value, type depends on field type
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      gt: function (val) {
        if (val == null) {
          return query.range[field].gt;
        }

        query.range[field].gt = val;
        return this;
      },

      /**
            Greater than or equal to value.  Same as setting from to the value,
            and include_lower to true.

            @member ejs.RangeQuery
            @param {*} val the value, type depends on field type
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      gte: function (val) {
        if (val == null) {
          return query.range[field].gte;
        }

        query.range[field].gte = val;
        return this;
      },

      /**
            Less than value.  Same as setting to to the value, and include_upper 
            to false.

            @member ejs.RangeQuery
            @param {*} val the value, type depends on field type
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      lt: function (val) {
        if (val == null) {
          return query.range[field].lt;
        }

        query.range[field].lt = val;
        return this;
      },

      /**
            Less than or equal to value.  Same as setting to to the value, 
            and include_upper to true.

            @member ejs.RangeQuery
            @param {*} val the value, type depends on field type
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      lte: function (val) {
        if (val == null) {
          return query.range[field].lte;
        }

        query.range[field].lte = val;
        return this;
      },
                            
      /**
            Sets the boost value of the <code>Query</code>.

            @member ejs.RangeQuery
            @param {Double} boost A positive <code>double</code> value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      boost: function (boost) {
        if (boost == null) {
          return query.range[field].boost;
        }

        query.range[field].boost = boost;
        return this;
      }
      
    });
  };

  /**
    @class
    <p>Matches documents that have fields matching a regular expression. Based 
    on Lucene 4.0 RegexpQuery which uses automaton to efficiently iterate over 
    index terms.</p>

    @name ejs.RegexpQuery
    @ejs query
    @borrows ejs.QueryMixin._type as _type
    @borrows ejs.QueryMixin.toJSON as toJSON

    @desc
    Matches documents that have fields matching a regular expression.

    @param {String} field A valid field name.
    @param {String} value A regex pattern.
    */
  ejs.RegexpQuery = function (field, value) {

    var
      _common = ejs.QueryMixin('regexp'),
      query = _common.toJSON();

    query.regexp[field] = {
      value: value
    };

    return extend(_common, {

      /**
             The field to run the query against.

             @member ejs.RegexpQuery
             @param {String} f A single field name.
             @returns {Object} returns <code>this</code> so that calls can be chained.
             */
      field: function (f) {
        var oldValue = query.regexp[field];

        if (f == null) {
          return field;
        }

        delete query.regexp[field];
        field = f;
        query.regexp[f] = oldValue;

        return this;
      },

      /**
            The regexp value.

            @member ejs.RegexpQuery
            @param {String} p A string regexp
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      value: function (p) {
        if (p == null) {
          return query.regexp[field].value;
        }

        query.regexp[field].value = p;
        return this;
      },

      /**
            The regex flags to use.  Valid flags are:
          
            INTERSECTION - Support for intersection notation
            COMPLEMENT - Support for complement notation
            EMPTY - Support for the empty language symbol: #
            ANYSTRING - Support for the any string symbol: @
            INTERVAL - Support for numerical interval notation: <n-m>
            NONE - Disable support for all syntax options
            ALL - Enables support for all syntax options
          
            Use multiple flags by separating with a "|" character.  Example:
          
            INTERSECTION|COMPLEMENT|EMPTY

            @member ejs.RegexpQuery
            @param {String} f The flags as a string, separate multiple flags with "|".
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      flags: function (f) {
        if (f == null) {
          return query.regexp[field].flags;
        }

        query.regexp[field].flags = f;
        return this;
      },
    
      /**
            The regex flags to use as a numeric value.  Advanced use only,
            it is probably better to stick with the <code>flags</code> option.
          
            @member ejs.RegexpQuery
            @param {String} v The flags as a numeric value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      flagsValue: function (v) {
        if (v == null) {
          return query.regexp[field].flags_value;
        }

        query.regexp[field].flags_value = v;
        return this;
      },
    
      /**
            Sets rewrite method.  Valid values are: 
          
            constant_score_auto - tries to pick the best constant-score rewrite 
              method based on term and document counts from the query
            
            scoring_boolean - translates each term into boolean should and 
              keeps the scores as computed by the query
            
            constant_score_boolean - same as scoring_boolean, expect no scores
              are computed.
            
            constant_score_filter - first creates a private Filter, by visiting 
              each term in sequence and marking all docs for that term
            
            top_terms_boost_N - first translates each term into boolean should
              and scores are only computed as the boost using the top N
              scoring terms.  Replace N with an integer value.
            
            top_terms_N -   first translates each term into boolean should
                and keeps the scores as computed by the query. Only the top N
                scoring terms are used.  Replace N with an integer value.
          
            Default is constant_score_auto.

            This is an advanced option, use with care.

            @member ejs.RegexpQuery
            @param {String} m The rewrite method as a string.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      rewrite: function (m) {
        if (m == null) {
          return query.regexp[field].rewrite;
        }
      
        m = m.toLowerCase();
        if (m === 'constant_score_auto' || m === 'scoring_boolean' ||
          m === 'constant_score_boolean' || m === 'constant_score_filter' ||
          m.indexOf('top_terms_boost_') === 0 || 
          m.indexOf('top_terms_') === 0) {
          
          query.regexp[field].rewrite = m;
        }
      
        return this;
      },
    
      /**
            Sets the boost value of the <code>Query</code>.

            @member ejs.RegexpQuery
            @param {Double} boost A positive <code>double</code> value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      boost: function (boost) {
        if (boost == null) {
          return query.regexp[field].boost;
        }

        query.regexp[field].boost = boost;
        return this;
      }
      
    });
  };

  /**
    @class
    <p>Matches spans near the beginning of a field. The spanFirstQuery allows you to search
    for Spans that start and end within the first <code>n</code> positions of the document.
    The span first query maps to Lucene SpanFirstQuery.</p>

    @name ejs.SpanFirstQuery
    @ejs query
    @borrows ejs.QueryMixin.boost as boost
    @borrows ejs.QueryMixin._type as _type
    @borrows ejs.QueryMixin.toJSON as toJSON

    @desc
    Matches spans near the beginning of a field.

    @param {Query} spanQry A valid SpanQuery
    @param {Integer} end the maximum end position in a match.
    
    */
  ejs.SpanFirstQuery = function (spanQry, end) {

    if (!isQuery(spanQry)) {
      throw new TypeError('Argument must be a SpanQuery');
    }
    
    var 
      _common = ejs.QueryMixin('span_first'),
      query = _common.toJSON();
    
    query.span_first.match = spanQry.toJSON();
    query.span_first.end = end;

    return extend(_common, {

      /**
            Sets the span query to match on.

            @member ejs.SpanFirstQuery
            @param {Object} spanQuery Any valid span type query.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      match: function (spanQuery) {
        if (spanQuery == null) {
          return query.span_first.match;
        }
      
        if (!isQuery(spanQuery)) {
          throw new TypeError('Argument must be a SpanQuery');
        }
        
        query.span_first.match = spanQuery.toJSON();
        return this;
      },

      /**
            Sets the maximum end position permitted in a match.

            @member ejs.SpanFirstQuery
            @param {Number} position The maximum position length to consider.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      end: function (position) {
        if (position == null) {
          return query.span_first.end;
        }
      
        query.span_first.end = position;
        return this;
      }
      
    });
  };

  /**
    @class
    <p>Wraps lucene MultiTermQueries as a SpanQuery so it can be used in the
    various Span* queries.  Examples of valid MultiTermQueries are
    <code>Fuzzy, NumericRange, Prefix, Regex, Range, and Wildcard</code>.</p>

    @name ejs.SpanMultiTermQuery
    @ejs query
    @borrows ejs.QueryMixin.boost as boost
    @borrows ejs.QueryMixin._type as _type
    @borrows ejs.QueryMixin.toJSON as toJSON

    @desc
    Use MultiTermQueries as a SpanQuery.

    @param {Query} qry An optional multi-term query object.
    */
  ejs.SpanMultiTermQuery = function (qry) {

    if (qry != null && !isQuery(qry)) {
      throw new TypeError('Argument must be a MultiTermQuery');
    }

    var 
      _common = ejs.QueryMixin('span_multi'),
      query = _common.toJSON();
    
    query.span_multi.match = {};
    
    if (qry != null) {
      query.span_multi.match = qry.toJSON();
    }

    return extend(_common, {

      /**
            Sets the span query to match on.

            @member ejs.SpanMultiTermQuery
            @param {Object} mtQuery Any valid multi-term query.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      match: function (mtQuery) {
        if (mtQuery == null) {
          return query.span_multi.match;
        }
  
        if (!isQuery(mtQuery)) {
          throw new TypeError('Argument must be a MultiTermQuery');
        }
    
        query.span_multi.match = mtQuery.toJSON();
        return this;
      }
      
    });
  };

  /**
    @class
    <p>A spanNearQuery will look to find a number of spanQuerys within a given
    distance from each other.</p>

    @name ejs.SpanNearQuery
    @ejs query
    @borrows ejs.QueryMixin.boost as boost
    @borrows ejs.QueryMixin._type as _type
    @borrows ejs.QueryMixin.toJSON as toJSON

    @desc
    Matches spans which are near one another.

    @param {(Query|Query[])} clauses A single SpanQuery or array of SpanQueries
    @param {Integer} slop The number of intervening unmatched positions

    */
  ejs.SpanNearQuery = function (clauses, slop) {

    var 
      i, 
      len,
      _common = ejs.QueryMixin('span_near'),
      query = _common.toJSON();
    
    query.span_near.clauses = [];
    query.span_near.slop = slop;
    
    if (isQuery(clauses)) {
      query.span_near.clauses.push(clauses.toJSON());
    } else if (isArray(clauses)) {
      for (i = 0, len = clauses.length; i < len; i++) {
        if (!isQuery(clauses[i])) {
          throw new TypeError('Argument must be array of SpanQueries');
        }
        
        query.span_near.clauses.push(clauses[i].toJSON());
      }
    } else {
      throw new TypeError('Argument must be SpanQuery or array of SpanQueries');
    }

    return extend(_common, {

      /**
            Sets the clauses used.  If passed a single SpanQuery, it is added
            to the existing list of clauses.  If passed an array of
            SpanQueries, they replace any existing clauses.

            @member ejs.SpanNearQuery
            @param {(Query|Query[])} clauses A SpanQuery or array of SpanQueries.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      clauses: function (clauses) {
        var i, len;
        
        if (clauses == null) {
          return query.span_near.clauses;
        }
      
        if (isQuery(clauses)) {
          query.span_near.clauses.push(clauses.toJSON());
        } else if (isArray(clauses)) {
          query.span_near.clauses = [];
          for (i = 0, len = clauses.length; i < len; i++) {
            if (!isQuery(clauses[i])) {
              throw new TypeError('Argument must be array of SpanQueries');
            }

            query.span_near.clauses.push(clauses[i].toJSON());
          }
        } else {
          throw new TypeError('Argument must be SpanQuery or array of SpanQueries');
        }
        
        return this;
      },

      /**
            Sets the maximum number of intervening unmatched positions.

            @member ejs.SpanNearQuery
            @param {Number} distance The number of intervening unmatched positions.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      slop: function (distance) {
        if (distance == null) {
          return query.span_near.slop;
        }
      
        query.span_near.slop = distance;
        return this;
      },

      /**
            Sets whether or not matches are required to be in-order.

            @member ejs.SpanNearQuery
            @param {Boolean} trueFalse Determines if matches must be in-order.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      inOrder: function (trueFalse) {
        if (trueFalse == null) {
          return query.span_near.in_order;
        }
      
        query.span_near.in_order = trueFalse;
        return this;
      },

      /**
            Sets whether or not payloads are being used. A payload is an arbitrary
            byte array stored at a specific position (i.e. token/term).

            @member ejs.SpanNearQuery
            @param {Boolean} trueFalse Whether or not to return payloads.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      collectPayloads: function (trueFalse) {
        if (trueFalse == null) {
          return query.span_near.collect_payloads;
        }
      
        query.span_near.collect_payloads = trueFalse;
        return this;
      }
      
    });
  };

  /**
    @class
    <p>Removes matches which overlap with another span query.
    The span not query maps to Lucene SpanNotQuery.</p>

    @name ejs.SpanNotQuery
    @ejs query
    @borrows ejs.QueryMixin.boost as boost
    @borrows ejs.QueryMixin._type as _type
    @borrows ejs.QueryMixin.toJSON as toJSON

    @desc
    Removes matches which overlap with another span query.

    @param {Query} includeQry a valid SpanQuery whose matching docs will be returned.
    @param {Query} excludeQry a valid SpanQuery whose matching docs will not be returned
    
    */
  ejs.SpanNotQuery = function (includeQry, excludeQry) {

    if (!isQuery(includeQry) || !isQuery(excludeQry)) {
      throw new TypeError('Argument must be a SpanQuery');
    }
    
    var
      _common = ejs.QueryMixin('span_not'),
      query = _common.toJSON();
    
    query.span_not.include = includeQry.toJSON();
    query.span_not.exclude = excludeQry.toJSON();

    return extend(_common, {

      /**
            Set the span query whose matches are filtered.

            @member ejs.SpanNotQuery
            @param {Object} spanQuery Any valid span type query.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      include: function (spanQuery) {
        if (spanQuery == null) {
          return query.span_not.include;
        }
      
        if (!isQuery(spanQuery)) {
          throw new TypeError('Argument must be a SpanQuery');
        }
        
        query.span_not.include = spanQuery.toJSON();
        return this;
      },

      /**
            Sets the span query whose matches must not overlap those returned.

            @member ejs.SpanNotQuery
            @param {Object} spanQuery Any valid span type query.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      exclude: function (spanQuery) {
        if (spanQuery == null) {
          return query.span_not.exclude;
        }
      
        if (!isQuery(spanQuery)) {
          throw new TypeError('Argument must be a SpanQuery');
        }
        
        query.span_not.exclude = spanQuery.toJSON();
        return this;
      }
      
    });
  };

  /**
    @class
    <p>The spanOrQuery takes an array of SpanQuerys and will match if any of the
    underlying SpanQueries match. The span or query maps to Lucene SpanOrQuery.</p>

    @name ejs.SpanOrQuery
    @ejs query
    @borrows ejs.QueryMixin.boost as boost
    @borrows ejs.QueryMixin._type as _type
    @borrows ejs.QueryMixin.toJSON as toJSON

    @desc
    Matches the union of its span clauses.

    @param {Object} clauses A single SpanQuery or array of SpanQueries.

    */
  ejs.SpanOrQuery = function (clauses) {

    var
      i, 
      len,
      _common = ejs.QueryMixin('span_or'),
      query = _common.toJSON();
    
    query.span_or.clauses = [];

    if (isQuery(clauses)) {
      query.span_or.clauses.push(clauses.toJSON());
    } else if (isArray(clauses)) {
      for (i = 0, len = clauses.length; i < len; i++) {
        if (!isQuery(clauses[i])) {
          throw new TypeError('Argument must be array of SpanQueries');
        }
        
        query.span_or.clauses.push(clauses[i].toJSON());
      }
    } else {
      throw new TypeError('Argument must be SpanQuery or array of SpanQueries');
    }

    return extend(_common, {

      /**
            Sets the clauses used.  If passed a single SpanQuery, it is added
            to the existing list of clauses.  If passed an array of
            SpanQueries, they replace any existing clauses.

            @member ejs.SpanOrQuery
            @param {(Query|Query[])} clauses A SpanQuery or array of SpanQueries.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      clauses: function (clauses) {
        var i, len;
        
        if (clauses == null) {
          return query.span_or.clauses;
        }
      
        if (isQuery(clauses)) {
          query.span_or.clauses.push(clauses.toJSON());
        } else if (isArray(clauses)) {
          query.span_or.clauses = [];
          for (i = 0, len = clauses.length; i < len; i++) {
            if (!isQuery(clauses[i])) {
              throw new TypeError('Argument must be array of SpanQueries');
            }

            query.span_or.clauses.push(clauses[i].toJSON());
          }
        } else {
          throw new TypeError('Argument must be SpanQuery or array of SpanQueries');
        }
        
        return this;
      }
      
    });
  };

  /**
    @class
    <p>A spanTermQuery is the basic unit of Lucene's Span Query which allows for nested,
    positional restrictions when matching documents. The spanTermQuery simply matches
    spans containing a term. It's essentially a termQuery with positional information asscoaited.</p>

    @name ejs.SpanTermQuery
    @ejs query
    @borrows ejs.QueryMixin._type as _type
    @borrows ejs.QueryMixin.toJSON as toJSON

    @desc
    Matches spans containing a term

    @param {String} field the document field/field to query against
    @param {String} value the literal value to be matched
    */
  ejs.SpanTermQuery = function (field, value) {

    var
      _common = ejs.QueryMixin('span_term'),
      query = _common.toJSON();

    query.span_term[field] = {
      term: value
    };

    return extend(_common, {

      /**
            Sets the field to query against.

            @member ejs.SpanTermQuery
            @param {String} f A valid field name.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      field: function (f) {
        var oldValue = query.span_term[field];
      
        if (f == null) {
          return field;
        }

        delete query.span_term[field];
        field = f;
        query.span_term[f] = oldValue;
      
        return this;
      },
    
      /**
            Sets the term.

            @member ejs.SpanTermQuery
            @param {String} t A single term.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      term: function (t) {
        if (t == null) {
          return query.span_term[field].term;
        }

        query.span_term[field].term = t;
        return this;
      },
      
      /**
            Sets the boost value for documents matching the <code>Query</code>.

            @member ejs.SpanTermQuery
            @param {Double} boost A positive <code>double</code> value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      boost: function (boost) {
        if (boost == null) {
          return query.span_term[field].boost;
        }

        query.span_term[field].boost = boost;
        return this;
      }
      
    });
  };

  /**
    @class
    <p>A <code>TermQuery</code> can be used to return documents containing a given
    keyword or <em>term</em>. For instance, you might want to retieve all the
    documents/objects that contain the term <code>Javascript</code>. Term filters
    often serve as the basis for more complex queries such as <em>Boolean</em> queries.</p>

    @name ejs.TermQuery
    @ejs query
    @borrows ejs.QueryMixin._type as _type
    @borrows ejs.QueryMixin.toJSON as toJSON

    @desc
    A Query that matches documents containing a term. This may be
    combined with other terms with a BooleanQuery.

    @param {String} field the document field/key to query against
    @param {String} term the literal value to be matched
    */
  ejs.TermQuery = function (field, term) {

    var
      _common = ejs.QueryMixin('term'),
      query = _common.toJSON();

    query.term[field] = {
      term: term
    };

    return extend(_common, {

      /**
            Sets the fields to query against.

            @member ejs.TermQuery
            @param {String} f A valid field name.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      field: function (f) {
        var oldValue = query.term[field];
      
        if (f == null) {
          return field;
        }

        delete query.term[field];
        field = f;
        query.term[f] = oldValue;
      
        return this;
      },
    
      /**
            Sets the term.

            @member ejs.TermQuery
            @param {String} t A single term.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      term: function (t) {
        if (t == null) {
          return query.term[field].term;
        }

        query.term[field].term = t;
        return this;
      },
      
      /**
            Sets the boost value for documents matching the <code>Query</code>.

            @member ejs.TermQuery
            @param {Number} boost A positive <code>double</code> value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      boost: function (boost) {
        if (boost == null) {
          return query.term[field].boost;
        }

        query.term[field].boost = boost;
        return this;
      }
      
    });
  };

  /**
    @class
    <p>A query that match on any (configurable) of the provided terms. This is 
    a simpler syntax query for using a bool query with several term queries 
    in the should clauses.</p>

    @name ejs.TermsQuery
    @ejs query
    @borrows ejs.QueryMixin.boost as boost
    @borrows ejs.QueryMixin._type as _type
    @borrows ejs.QueryMixin.toJSON as toJSON

    @desc
    A Query that matches documents containing provided terms. 

    @param {String} field the document field/key to query against
    @param {(String|String[])} terms a single term or array of "terms" to match
    */
  ejs.TermsQuery = function (field, terms) {

    var
      _common = ejs.QueryMixin('terms'),
      query = _common.toJSON();
    
    if (isString(terms)) {
      query.terms[field] = [terms];
    } else if (isArray(terms)) {
      query.terms[field] = terms;
    } else {
      throw new TypeError('Argument must be string or array');
    }
    
    return extend(_common, {

      /**
            Sets the fields to query against.

            @member ejs.TermsQuery
            @param {String} f A valid field name.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      field: function (f) {
        var oldValue = query.terms[field];
      
        if (f == null) {
          return field;
        }

        delete query.terms[field];
        field = f;
        query.terms[f] = oldValue;
      
        return this;
      },
    
      /**
            Sets the terms.  If you t is a String, it is added to the existing
            list of terms.  If t is an array, the list of terms replaces the
            existing terms.

            @member ejs.TermsQuery
            @param {(String|String[])} t A single term or an array or terms.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      terms: function (t) {
        if (t == null) {
          return query.terms[field];
        }

        if (isString(t)) {
          query.terms[field].push(t);
        } else if (isArray(t)) {
          query.terms[field] = t;
        } else {
          throw new TypeError('Argument must be string or array');
        }
      
        return this;
      },

      /**
            Sets the minimum number of terms that need to match in a document
            before that document is returned in the results.

            @member ejs.TermsQuery
            @param {Integer} min A positive integer.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      minimumShouldMatch: function (min) {
        if (min == null) {
          return query.terms.minimum_should_match;
        }
      
        query.terms.minimum_should_match = min;
        return this;
      },
      
      /**
            Enables or disables similarity coordinate scoring of documents
            matching the <code>Query</code>. Default: false.

            @member ejs.TermsQuery
            @param {String} trueFalse A <code>true/false</code value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      disableCoord: function (trueFalse) {
        if (trueFalse == null) {
          return query.terms.disable_coord;
        }

        query.terms.disable_coord = trueFalse;
        return this;
      }
      
    });
  };

  /**
    @class
    <p>TThe top_children query runs the child query with an estimated hits size, 
    and out of the hit docs, aggregates it into parent docs. If there aren’t 
    enough parent docs matching the requested from/size search request, then it 
    is run again with a wider (more hits) search.</p>

    <p>The top_children also provide scoring capabilities, with the ability to 
    specify max, sum or avg as the score type.</p>

    @name ejs.TopChildrenQuery
    @ejs query
    @borrows ejs.QueryMixin.boost as boost
    @borrows ejs.QueryMixin._type as _type
    @borrows ejs.QueryMixin.toJSON as toJSON

    @desc
    Returns child documents matching the query aggregated into the parent docs.

    @param {Object} qry A valid query object.
    @param {String} type The child type to execute the query on
    */
  ejs.TopChildrenQuery = function (qry, type) {

    if (!isQuery(qry)) {
      throw new TypeError('Argument must be a Query');
    }
    
    var 
      _common = ejs.QueryMixin('top_children'),
      query = _common.toJSON();
    
    query.top_children.query = qry.toJSON();
    query.top_children.type = type;

    return extend(_common, {

      /**
            Sets the query

            @member ejs.TopChildrenQuery
            @param {Object} q A valid Query object
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      query: function (q) {
        if (q == null) {
          return query.top_children.query;
        }
  
        if (!isQuery(q)) {
          throw new TypeError('Argument must be a Query');
        }
        
        query.top_children.query = q.toJSON();
        return this;
      },

      /**
            Sets the child document type to search against

            @member ejs.TopChildrenQuery
            @param {String} t A valid type name
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      type: function (t) {
        if (t == null) {
          return query.top_children.type;
        }
  
        query.top_children.type = t;
        return this;
      },

      /**
            Sets the scope of the query.  A scope allows to run facets on the 
            same scope name that will work against the child documents. 

            @deprecated since elasticsearch 0.90
            @member ejs.TopChildrenQuery
            @param {String} s The scope name as a string.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      scope: function (s) {
        return this;
      },

      /**
            Sets the scoring type.  Valid values are max, sum, or avg. If
            another value is passed it we silently ignore the value.

            @deprecated since elasticsearch 0.90.1, use scoreMode
            
            @member ejs.TopChildrenQuery
            @param {String} s The scoring type as a string. 
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      score: function (s) {
        if (s == null) {
          return query.top_children.score;
        }
  
        s = s.toLowerCase();
        if (s === 'max' || s === 'sum' || s === 'avg' || s === 'total') {
          query.top_children.score = s;
        }
      
        return this;
      },
  
      /**
            Sets the scoring type.  Valid values are max, sum, total, or avg. 
            If another value is passed it we silently ignore the value.

            @member ejs.TopChildrenQuery
            @param {String} s The scoring type as a string. 
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      scoreMode: function (s) {
        if (s == null) {
          return query.top_children.score_mode;
        }
  
        s = s.toLowerCase();
        if (s === 'max' || s === 'sum' || s === 'avg' || s === 'total') {
          query.top_children.score_mode = s;
        }
      
        return this;
      },
      
      /**
            Sets the factor which is the number of hits that are asked for in
            the child query.  Defaults to 5.

            @member ejs.TopChildrenQuery
            @param {Integer} f A positive integer value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      factor: function (f) {
        if (f == null) {
          return query.top_children.factor;
        }

        query.top_children.factor = f;
        return this;
      },

      /**
            Sets the incremental factor.  The incremental factor is used when not
            enough child documents are returned so the factor is multiplied by
            the incremental factor to fetch more results.  Defaults to 52

            @member ejs.TopChildrenQuery
            @param {Integer} f A positive integer value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      incrementalFactor: function (f) {
        if (f == null) {
          return query.top_children.incremental_factor;
        }

        query.top_children.incremental_factor = f;
        return this;
      }
      
    });
  };

  /**
    @class
    <p>Matches documents that have fields matching a wildcard expression 
    (not analyzed). Supported wildcards are *, which matches any character 
    sequence (including the empty one), and ?, which matches any single 
    character. Note this query can be slow, as it needs to iterate over many 
    wildcards. In order to prevent extremely slow wildcard queries, a wildcard 
    wildcard should not start with one of the wildcards * or ?. The wildcard query 
    maps to Lucene WildcardQuery.</p>

    @name ejs.WildcardQuery
    @ejs query
    @borrows ejs.QueryMixin._type as _type
    @borrows ejs.QueryMixin.toJSON as toJSON

    @desc
    A Query that matches documents containing a wildcard. This may be
    combined with other wildcards with a BooleanQuery.

    @param {String} field the document field/key to query against
    @param {String} value the literal value to be matched
    */
  ejs.WildcardQuery = function (field, value) {

    var
      _common = ejs.QueryMixin('wildcard'),
      query = _common.toJSON();

    query.wildcard[field] = {
      value: value
    };

    return extend(_common, {

      /**
            Sets the fields to query against.

            @member ejs.WildcardQuery
            @param {String} f A valid field name.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      field: function (f) {
        var oldValue = query.wildcard[field];
    
        if (f == null) {
          return field;
        }

        delete query.wildcard[field];
        field = f;
        query.wildcard[f] = oldValue;
    
        return this;
      },
  
      /**
            Sets the wildcard query value.

            @member ejs.WildcardQuery
            @param {String} v A single term.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      value: function (v) {
        if (v == null) {
          return query.wildcard[field].value;
        }

        query.wildcard[field].value = v;
        return this;
      },
    
      /**
            Sets rewrite method.  Valid values are: 
            
            constant_score_auto - tries to pick the best constant-score rewrite 
              method based on term and document counts from the query
              
            scoring_boolean - translates each term into boolean should and 
              keeps the scores as computed by the query
              
            constant_score_boolean - same as scoring_boolean, expect no scores
              are computed.
              
            constant_score_filter - first creates a private Filter, by visiting 
              each term in sequence and marking all docs for that term
              
            top_terms_boost_N - first translates each term into boolean should
              and scores are only computed as the boost using the top N
              scoring terms.  Replace N with an integer value.
              
            top_terms_N -   first translates each term into boolean should
                and keeps the scores as computed by the query. Only the top N
                scoring terms are used.  Replace N with an integer value.
            
            Default is constant_score_auto.

            This is an advanced option, use with care.

            @member ejs.WildcardQuery
            @param {String} m The rewrite method as a string.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      rewrite: function (m) {
        if (m == null) {
          return query.wildcard[field].rewrite;
        }
        
        m = m.toLowerCase();
        if (m === 'constant_score_auto' || m === 'scoring_boolean' ||
          m === 'constant_score_boolean' || m === 'constant_score_filter' ||
          m.indexOf('top_terms_boost_') === 0 || 
          m.indexOf('top_terms_') === 0) {
            
          query.wildcard[field].rewrite = m;
        }
        
        return this;
      },
      
      /**
            Sets the boost value for documents matching the <code>Query</code>.

            @member ejs.WildcardQuery
            @param {Number} boost A positive <code>double</code> value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      boost: function (boost) {
        if (boost == null) {
          return query.wildcard[field].boost;
        }

        query.wildcard[field].boost = boost;
        return this;
      }
      
    });
  };

  /**
    @class
    <p>The boost_factor score allows you to multiply the score by the provided
    boost_factor. This can sometimes be desired since boost value set on specific
    queries gets normalized, while for this score function it does not.</p>

    @name ejs.BoostFactorScoreFunction
    @ejs scorefunction
    @borrows ejs.ScoreFunctionMixin.filter as filter
    @borrows ejs.ScoreFunctionMixin._type as _type
    @borrows ejs.ScoreFunctionMixin.toJSON as toJSON

    @param {Float} boostVal the boost factor.

    @desc
    <p>Multiply the score by the provided boost_factor.</p>

    */
  ejs.BoostFactorScoreFunction = function (boostVal) {

    var
      _common = ejs.ScoreFunctionMixin('boost_factor'),
      func = _common.toJSON();

    func.boost_factor = boostVal;

    return extend(_common, {

      /**
      Sets the boost factor.

      @member ejs.BoostFactorScoreFunction
      @param {Float} b the boost factor.
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      boost: function (b) {
        if (b == null) {
          return func.boost_factor;
        }

        func.boost_factor = b;
        return this;
      }

    });
  };

  /**
    @class
    <p>Decay functions score a document with a function that decays depending on
    the distance of a numeric field value of the document from a user given
    origin. This is similar to a range query, but with smooth edges instead of
    boxes.</p>

    <p>Supported decay functions are: linear, exp, and gauss.</p>

    @name ejs.DecayScoreFunction
    @ejs scorefunction
    @borrows ejs.ScoreFunctionMixin.filter as filter
    @borrows ejs.ScoreFunctionMixin._type as _type
    @borrows ejs.ScoreFunctionMixin.toJSON as toJSON

    @param {String} field the document field to run decay function against.

    @desc
    <p>Score a document with a function that decays depending on the distance
    of a numeric field value of the document from given origin.</p>

    */
  ejs.DecayScoreFunction = function (field) {

    var
      mode = 'gauss', // default decay function
      _common = ejs.ScoreFunctionMixin(mode),
      func = _common.toJSON(),
      changeMode = function (newMode) {
        var oldValue;
        if (mode !== newMode) {
          oldValue = func[mode];
          delete func[mode];
          mode = newMode;
          func[mode] = oldValue;
        }
      };

    func[mode][field] = {};

    return extend(_common, {

      /**
      Use the linear decay function. Linear decay.

      @member ejs.DecayScoreFunction
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      linear: function () {
        changeMode('linear');
      },

      /**
      Use the exp decay function. Exponential decay.

      @member ejs.DecayScoreFunction
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      exp: function () {
        changeMode('exp');
      },

      /**
      Use the gauss decay function. Normal decay.

      @member ejs.DecayScoreFunction
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      gauss: function () {
        changeMode('gauss');
      },

      /**
      Sets the fields to run the decay function against.

      @member ejs.DecayScoreFunction
      @param {String} f A valid field name.
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      field: function (f) {
        var oldValue = func[mode][field];

        if (f == null) {
          return field;
        }

        delete func[mode][field];
        field = f;
        func[mode][field] = oldValue;

        return this;
      },

      /**
      Sets the scale/rate of decay.

      @member ejs.DecayScoreFunction
      @param {String} s A valid scale value for the field type.
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      scale: function (s) {
        if (s == null) {
          return func[mode][field].scale;
        }

        func[mode][field].scale = s;
        return this;
      },

      /**
      Sets the origin which is the “central point” from which the distance is
      calculated.

      @member ejs.DecayScoreFunction
      @param {String} o A valid origin value for the field type.
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      origin: function (o) {
        if (o == null) {
          return func[mode][field].origin;
        }

        if (isGeoPoint(o)) {
          func[mode][field].origin = o.toJSON();
        } else if (isEJSObject(o)) {
          throw new TypeError('origin must be a GeoPoint or native type');
        } else {
          func[mode][field].origin = o;
        }

        return this;
      },

      /**
      Sets the decay value which defines how documents are scored at the distance
      given at scale.

      @member ejs.DecayScoreFunction
      @param {Double} d A decay value as a double.
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      decay: function (d) {
        if (d == null) {
          return func[mode][field].decay;
        }

        func[mode][field].decay = d;
        return this;
      },

      /**
      Sets the decay offset.  The decay function will only compute a the decay
      function for documents with a distance greater that the defined offset.
      The default is 0.

      @member ejs.DecayScoreFunction
      @param {String} o A valid offset value for the field type.
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      offset: function (o) {
        if (o == null) {
          return func[mode][field].offset;
        }

        func[mode][field].offset = o;
        return this;
      }

    });
  };

  /**
    @class
    <p>The random_score generates scores via a pseudo random number algorithm
    that is initialized with a seed.</p>

    @name ejs.RandomScoreFunction
    @ejs scorefunction
    @borrows ejs.ScoreFunctionMixin.filter as filter
    @borrows ejs.ScoreFunctionMixin._type as _type
    @borrows ejs.ScoreFunctionMixin.toJSON as toJSON

    @desc
    <p>Randomly score documents.</p>

    */
  ejs.RandomScoreFunction = function () {

    var
      _common = ejs.ScoreFunctionMixin('random_score'),
      func = _common.toJSON();

    return extend(_common, {

      /**
      Sets random seed value.

      @member ejs.RandomScoreFunction
      @param {Long} s A seed value.
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      seed: function (s) {
        if (s == null) {
          return func.random_score.seed;
        }

        func.random_score.seed = s;
        return this;
      }

    });
  };

  /**
    @class
    <p>The script_score function allows you to wrap another query and customize
    the scoring of it optionally with a computation derived from other numeric
    field values in the doc using a script expression.</p>

    @name ejs.ScriptScoreFunction
    @ejs scorefunction
    @borrows ejs.ScoreFunctionMixin.filter as filter
    @borrows ejs.ScoreFunctionMixin._type as _type
    @borrows ejs.ScoreFunctionMixin.toJSON as toJSON

    @desc
    <p>Modify a documents score using a script.</p>

    */
  ejs.ScriptScoreFunction = function () {

    var
      _common = ejs.ScoreFunctionMixin('script_score'),
      func = _common.toJSON();

    return extend(_common, {

      /**
      Set the script that will modify the score.

      @member ejs.ScriptScoreFunction
      @param {String} scriptCode A valid script string to execute.
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      script: function (scriptCode) {
        if (scriptCode == null) {
          return func.script_score.script;
        }

        func.script_score.script = scriptCode;
        return this;
      },

      /**
      The script language being used.

      @member ejs.ScriptScoreFunction
      @param {String} language The language of the script.
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      lang: function (language) {
        if (language == null) {
          return func.script_score.lang;
        }

        func.script_score.lang = language;
        return this;
      },

      /**
      Sets parameters that will be applied to the script.  Overwrites
      any existing params.

      @member ejs.ScriptScoreFunction
      @param {Object} p An object where the keys are the parameter name and
        values are the parameter value.
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      params: function (p) {
        if (p == null) {
          return func.script_score.params;
        }

        func.script_score.params = p;
        return this;
      }


    });
  };

  /**
    @class
    <p>A GeoPoint object that can be used in queries and filters that 
    take a GeoPoint.  GeoPoint supports various input formats.</p>

    <p>See http://www.elasticsearch.org/guide/reference/mapping/geo-point-type.html</p>

    @name ejs.GeoPoint
    @ejs geo

    @desc
    <p>Defines a point</p>

    @param {Array} p An optional point as an array in [lat, lon] format.
    */
  ejs.GeoPoint = function (p) {

    var point = [0, 0];

    // p  = [lat, lon], convert it to GeoJSON format of [lon, lat]
    if (p != null && isArray(p) && p.length === 2) {
      point = [p[1], p[0]];
    }
  
    return {

      /**
            Sets the GeoPoint as properties on an object.  The object must have
            a 'lat' and 'lon' or a 'geohash' property.  
          
            Example:
            {lat: 41.12, lon: -71.34} or {geohash: "drm3btev3e86"}

            @member ejs.GeoPoint
            @param {Object} obj an object with a lat and lon or geohash property.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      properties: function (obj) {
        if (obj == null) {
          return point;
        }
      
        if (isObject(obj) && has(obj, 'lat') && has(obj, 'lon')) {
          point = {
            lat: obj.lat,
            lon: obj.lon
          };
        } else if (isObject(obj) && has(obj, 'geohash')) {
          point = {
            geohash: obj.geohash
          };
        }
      
        return this;
      },

      /**
            Sets the GeoPoint as a string.  The format is "lat,lon".
          
            Example:
          
            "41.12,-71.34"

            @member ejs.GeoPoint
            @param {String} s a String point in "lat,lon" format.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      string: function (s) {
        if (s == null) {
          return point;
        }
      
        if (isString(s) && s.indexOf(',') !== -1) {
          point = s;
        }
      
        return this;
      },
    
      /**
            Sets the GeoPoint as a GeoHash.  The hash is a string of 
            alpha-numeric characters with a precision length that defaults to 12.
          
            Example:
            "drm3btev3e86"

            @member ejs.GeoPoint
            @param {String} hash an GeoHash as a string
            @param {Integer} precision an optional precision length, defaults
              to 12 if not specified.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      geohash: function (hash, precision) {
        // set precision, default to 12
        precision = (precision != null && isNumber(precision)) ? precision : 12;
      
        if (hash == null) {
          return point;
        }
      
        if (isString(hash) && hash.length === precision) {
          point = hash;
        }
      
        return this;
      },
    
      /**
            Sets the GeoPoint from an array point.  The array must contain only
            2 values.  The first value is the lat and the 2nd value is the lon.
          
            Example:
            [41.12, -71.34]

            @member ejs.GeoPoint
            @param {Array} a an array of length 2.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      array: function (a) {
        if (a == null) {
          return point;
        }
      
      
        // convert to GeoJSON format of [lon, lat]
        if (isArray(a) && a.length === 2) {
          point = [a[1], a[0]];
        }
      
        return this;
      },

      /**
            The type of ejs object.  For internal use only.
            
            @member ejs.GeoPoint
            @returns {String} the type of object
            */
      _type: function () {
        return 'geo point';
      },
      
      /**
            Retrieves the internal <code>script</code> object. This is typically used by
            internal API functions so use with caution.

            @member ejs.GeoPoint
            @returns {String} returns this object's internal object representation.
            */
      toJSON: function () {
        return point;
      }
    };
  };

  /**
    @class
    <p>Allows to highlight search results on one or more fields.  In order to
    perform highlighting, the actual content of the field is required. If the
    field in question is stored (has store set to yes in the mapping), it will
    be used, otherwise, the actual _source will be loaded and the relevant
    field will be extracted from it.</p>

    <p>If no term_vector information is provided (by setting it to
    with_positions_offsets in the mapping), then the plain highlighter will be
    used. If it is provided, then the fast vector highlighter will be used.
    When term vectors are available, highlighting will be performed faster at
    the cost of bigger index size.</p>

    <p>See http://www.elasticsearch.org/guide/reference/api/search/highlighting.html</p>

    @name ejs.Highlight
    @ejs request

    @desc
    <p>Allows to highlight search results on one or more fields.</p>

    @param {(String|String[])} fields An optional field or array of fields to highlight.
    */
  ejs.Highlight = function (fields) {

    var highlight = {
      fields: {}
    },

    addOption = function (field, option, val) {
      if (field == null) {
        highlight[option] = val;
      } else {
        if (!has(highlight.fields, field)) {
          highlight.fields[field] = {};
        }

        highlight.fields[field][option] = val;
      }
    };

    if (fields != null) {
      if (isString(fields)) {
        highlight.fields[fields] = {};
      } else if (isArray(fields)) {
        each(fields, function (field) {
          highlight.fields[field] = {};
        });
      }
    }

    return {

      /**
            Allows you to set the fields that will be highlighted.  You can
            specify a single field or an array of fields.  All fields are
            added to the current list of fields.

            @member ejs.Highlight
            @param {(String|String[])} vals A field name or array of field names.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      fields: function (vals) {
        if (vals == null) {
          return highlight.fields;
        }

        if (isString(vals)) {
          if (!has(highlight.fields, vals)) {
            highlight.fields[vals] = {};
          }
        } else if (isArray(vals)) {
          each(vals, function (field) {
            if (!has(highlight.fields, field)) {
              highlight.fields[field] = {};
            }
          });
        }
      },

      /**
            Sets the pre tags for highlighted fragments.  You can apply the
            tags to a specific field by passing the field name in to the
            <code>oField</code> parameter.

            @member ejs.Highlight
            @param {(String|String[])} tags A single tag or an array of tags.
            @param {String} oField An optional field name
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      preTags: function (tags, oField) {
        if (tags === null && oField != null) {
          return highlight.fields[oField].pre_tags;
        } else if (tags == null) {
          return highlight.pre_tags;
        }

        if (isString(tags)) {
          addOption(oField, 'pre_tags', [tags]);
        } else if (isArray(tags)) {
          addOption(oField, 'pre_tags', tags);
        }

        return this;
      },

      /**
            Sets the post tags for highlighted fragments.  You can apply the
            tags to a specific field by passing the field name in to the
            <code>oField</code> parameter.

            @member ejs.Highlight
            @param {(String|String[])} tags A single tag or an array of tags.
            @param {String} oField An optional field name
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      postTags: function (tags, oField) {
        if (tags === null && oField != null) {
          return highlight.fields[oField].post_tags;
        } else if (tags == null) {
          return highlight.post_tags;
        }

        if (isString(tags)) {
          addOption(oField, 'post_tags', [tags]);
        } else if (isArray(tags)) {
          addOption(oField, 'post_tags', tags);
        }

        return this;
      },

      /**
            Sets the order of highlight fragments.  You can apply the option
            to a specific field by passing the field name in to the
            <code>oField</code> parameter.  Valid values for order are:

            score - the score calculated by Lucene's highlighting framework.

            @member ejs.Highlight
            @param {String} o The order.  Currently only "score".
            @param {String} oField An optional field name
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      order: function (o, oField) {
        if (o === null && oField != null) {
          return highlight.fields[oField].order;
        } else if (o == null) {
          return highlight.order;
        }

        o = o.toLowerCase();
        if (o === 'score') {
          addOption(oField, 'order', o);
        }

        return this;
      },

      /**
            Sets the schema to be used for the tags. Valid values are:

            styled - 10 <em> pre tags with css class of hltN, where N is 1-10

            @member ejs.Highlight
            @param {String} s The schema.  Currently only "styled".
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      tagsSchema: function (s) {
        if (s == null) {
          return highlight.tags_schema;
        }

        s = s.toLowerCase();
        if (s === 'styled') {
          highlight.tags_schema = s;
        }

        return this;
      },

      /**
            Enables highlights in documents matched by a filter.
            You can apply the option to a specific field by passing the field
            name in to the <code>oField</code> parameter.  Defaults to false.

            @member ejs.Highlight
            @param {Boolean} trueFalse If filtered docs should be highlighted.
            @param {String} oField An optional field name
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      highlightFilter: function (trueFalse, oField) {
        if (trueFalse === null && oField != null) {
          return highlight.fields[oField].highlight_filter;
        } else if (trueFalse == null) {
          return highlight.highlight_filter;
        }

        addOption(oField, 'highlight_filter', trueFalse);
        return this;
      },

      /**
            Sets the size of each highlight fragment in characters.
            You can apply the option to a specific field by passing the field
            name in to the <code>oField</code> parameter. Default:  100

            @member ejs.Highlight
            @param {Integer} size The fragment size in characters.
            @param {String} oField An optional field name
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      fragmentSize: function (size, oField) {
        if (size === null && oField != null) {
          return highlight.fields[oField].fragment_size;
        } else if (size == null) {
          return highlight.fragment_size;
        }

        addOption(oField, 'fragment_size', size);
        return this;
      },

      /**
            Sets the number of highlight fragments.
            You can apply the option to a specific field by passing the field
            name in to the <code>oField</code> parameter. Default:  5

            @member ejs.Highlight
            @param {Integer} cnt The fragment size in characters.
            @param {String} oField An optional field name
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      numberOfFragments: function (cnt, oField) {
        if (cnt === null && oField != null) {
          return highlight.fields[oField].number_of_fragments;
        } else if (cnt == null) {
          return highlight.number_of_fragments;
        }

        addOption(oField, 'number_of_fragments', cnt);
        return this;
      },

      /**
            Sets highlight encoder.  Valid values are:

            default - the default, no encoding
            html - to encode html characters if you use html tags

            @member ejs.Highlight
            @param {String} e The encoder.  default or html
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      encoder: function (e) {
        if (e == null) {
          return highlight.encoder;
        }

        e = e.toLowerCase();
        if (e === 'default' || e === 'html') {
          highlight.encoder = e;
        }

        return this;
      },

      /**
            When enabled it will cause a field to be highlighted only if a
            query matched that field. false means that terms are highlighted
            on all requested fields regardless if the query matches
            specifically on them.  You can apply the option to a specific
            field by passing the field name in to the <code>oField</code>
            parameter.  Defaults to false.

            @member ejs.Highlight
            @param {Boolean} trueFalse If filtered docs should be highlighted.
            @param {String} oField An optional field name
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      requireFieldMatch: function (trueFalse, oField) {
        if (trueFalse === null && oField != null) {
          return highlight.fields[oField].require_field_match;
        } else if (trueFalse == null) {
          return highlight.require_field_match;
        }

        addOption(oField, 'require_field_match', trueFalse);
        return this;
      },

      /**
            Sets the max number of characters to scan while looking for the
            start of a boundary character. You can apply the option to a
            specific field by passing the field name in to the
            <code>oField</code> parameter. Default:  20

            @member ejs.Highlight
            @param {Integer} cnt The max characters to scan.
            @param {String} oField An optional field name
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      boundaryMaxScan: function (cnt, oField) {
        if (cnt === null && oField != null) {
          return highlight.fields[oField].boundary_max_scan;
        } else if (cnt == null) {
          return highlight.boundary_max_scan;
        }

        addOption(oField, 'boundary_max_scan', cnt);
        return this;
      },

      /**
            Set's the boundary characters.  When highlighting a field that is
            mapped with term vectors, boundary_chars can be configured to
            define what constitutes a boundary for highlighting. It’s a single
            string with each boundary character defined in it. You can apply
            the option to a specific field by passing the field name in to
            the <code>oField</code> parameter. It defaults to ".,!? \t\n".

            @member ejs.Highlight
            @param {String} charStr The boundary chars in a string.
            @param {String} oField An optional field name
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      boundaryChars: function (charStr, oField) {
        if (charStr === null && oField != null) {
          return highlight.fields[oField].boundary_chars;
        } else if (charStr == null) {
          return highlight.boundary_chars;
        }

        addOption(oField, 'boundary_chars', charStr);
        return this;
      },

      /**
            Sets the highligher type.  You can apply the option
            to a specific field by passing the field name in to the
            <code>oField</code> parameter.  Valid values for order are:

            fast-vector-highlighter - the fast vector based highligher
            highlighter - the slower plain highligher

            @member ejs.Highlight
            @param {String} t The highligher.
            @param {String} oField An optional field name
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      type: function (t, oField) {
        if (t === null && oField != null) {
          return highlight.fields[oField].type;
        } else if (t == null) {
          return highlight.type;
        }

        t = t.toLowerCase();
        if (t === 'fast-vector-highlighter' || t === 'highlighter' ||
            t === 'postings') {
          addOption(oField, 'type', t);
        }

        return this;
      },

      /**
            Sets the fragmenter type.  You can apply the option
            to a specific field by passing the field name in to the
            <code>oField</code> parameter.  Valid values for order are:

            simple - breaks text up into same-size fragments with no concerns
              over spotting sentence boundaries.
            span - breaks text up into same-size fragments but does not split
              up Spans.

            @member ejs.Highlight
            @param {String} f The fragmenter.
            @param {String} oField An optional field name
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      fragmenter: function (f, oField) {
        if (f === null && oField != null) {
          return highlight.fields[oField].fragmenter;
        } else if (f == null) {
          return highlight.fragmenter;
        }

        f = f.toLowerCase();
        if (f === 'simple' || f === 'span') {
          addOption(oField, 'fragmenter', f);
        }

        return this;
      },

      /**
            Sets arbitrary options that can be passed to the highlighter
            implementation in use.

            @since elasticsearch 0.90.1

            @member ejs.Highlight
            @param {String} opts A map/object of option name and values.
            @param {Object} oField An optional field name
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      options: function (opts, oField) {
        if (opts === null && oField != null) {
          return highlight.fields[oField].options;
        } else if (opts == null) {
          return highlight.options;
        }

        if (!isObject(opts) || isArray(opts) || isEJSObject(opts)) {
          throw new TypeError('Parameter must be an object');
        }

        addOption(oField, 'options', opts);
        return this;
      },

      /**
            The type of ejs object.  For internal use only.

            @member ejs.Highlight
            @returns {String} the type of object
            */
      _type: function () {
        return 'highlight';
      },

      /**
            Retrieves the internal <code>script</code> object. This is typically used by
            internal API functions so use with caution.

            @member ejs.Highlight
            @returns {String} returns this object's internal object representation.
            */
      toJSON: function () {
        return highlight;
      }
    };
  };

  /**
    @class
    <p>A shape which has already been indexed in another index and/or index 
    type. This is particularly useful for when you have a pre-defined list of 
    shapes which are useful to your application and you want to reference this 
    using a logical name (for example ‘New Zealand’) rather than having to 
    provide their coordinates each time.</p>

    @name ejs.IndexedShape
    @ejs geo

    @desc
    <p>Defines a shape that already exists in an index/type.</p>

    @param {String} type The name of the type where the shape is indexed.
    @param {String} id The document id of the shape.

    */
  ejs.IndexedShape = function (type, id) {

    var indexedShape = {
      type: type,
      id: id
    };

    return {

      /**
            Sets the type which the shape is indexed under.

            @member ejs.IndexedShape
            @param {String} t a valid shape type.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      type: function (t) {
        if (t == null) {
          return indexedShape.type;
        }
    
        indexedShape.type = t;
        return this;
      },

      /**
            Sets the document id of the indexed shape.

            @member ejs.IndexedShape
            @param {String} id a valid document id.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      id: function (id) {
        if (id == null) {
          return indexedShape.id;
        }
    
        indexedShape.id = id;
        return this;
      },

      /**
            Sets the index which the shape is indexed under. 
            Defaults to "shapes".

            @member ejs.IndexedShape
            @param {String} idx a valid index name.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      index: function (idx) {
        if (idx == null) {
          return indexedShape.index;
        }
    
        indexedShape.index = idx;
        return this;
      },

      /**
            Sets the field name containing the indexed shape. 
            Defaults to "shape".

            @member ejs.IndexedShape
            @param {String} field a valid field name.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      shapeFieldName: function (field) {
        if (field == null) {
          return indexedShape.shape_field_name;
        }
    
        indexedShape.shape_field_name = field;
        return this;
      },

      /**
            The type of ejs object.  For internal use only.
            
            @member ejs.IndexedShape
            @returns {String} the type of object
            */
      _type: function () {
        return 'indexed shape';
      },
      
      /**
            Retrieves the internal <code>script</code> object. This is typically used by
            internal API functions so use with caution.

            @member ejs.IndexedShape
            @returns {String} returns this object's internal object representation.
            */
      toJSON: function () {
        return indexedShape;
      }
    };
  };

  /**
    @class
    <p>The <code>Request</code> object provides methods generating an elasticsearch request body.</p>

    @name ejs.Request
    @ejs request

    @desc
    <p>Provides methods for generating request bodies.</p>

    @param {Object} conf A configuration object containing the initilization
      parameters.  The following parameters can be set in the conf object:
        indices - single index name or array of index names
        types - single type name or array of types
        routing - the shard routing value
    */
  ejs.Request = function () {

    /**
        The internal query object.
        @member ejs.Request
        @property {Object} query
        */
    var query = {};

    return {

      /**
            <p>Sets the sorting for the query.  This accepts many input formats.</p>

            <dl>
                <dd><code>sort()</code> - The current sorting values are returned.</dd>
                <dd><code>sort(fieldName)</code> - Adds the field to the current list of sorting values.</dd>
                <dd><code>sort(fieldName, order)</code> - Adds the field to the current list of
                    sorting with the specified order.  Order must be asc or desc.</dd>
                <dd><code>sort(ejs.Sort)</code> - Adds the Sort value to the current list of sorting values.</dd>
                <dd><code>sort(array)</code> - Replaces all current sorting values with values
                    from the array.  The array must contain only strings and Sort objects.</dd>
            </dl>

            <p>Multi-level sorting is supported so the order in which sort fields
            are added to the query requests is relevant.</p>

            <p>It is recommended to use <code>Sort</code> objects when possible.</p>

            @member ejs.Request
            @param {String} fieldName The field to be sorted by.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      sort: function () {
        var i, len;

        if (!has(query, "sort")) {
          query.sort = [];
        }

        if (arguments.length === 0) {
          return query.sort;
        }

        // if passed a single argument
        if (arguments.length === 1) {
          var sortVal = arguments[0];

          if (isString(sortVal)) {
            // add  a single field name
            query.sort.push(sortVal);
          } else if (isSort(sortVal)) {
            // add the Sort object
            query.sort.push(sortVal.toJSON());
          } else if (isArray(sortVal)) {
            // replace with all values in the array
            // the values must be a fieldName (string) or a
            // Sort object.  Any other type throws an Error.
            query.sort = [];
            for (i = 0, len = sortVal.length; i < len; i++) {
              if (isString(sortVal[i])) {
                query.sort.push(sortVal[i]);
              } else if (isSort(sortVal[i])) {
                query.sort.push(sortVal[i].toJSON());
              } else {
                throw new TypeError('Invalid object in array');
              }
            }
          } else {
            // Invalid object type as argument.
            throw new TypeError('Argument must be string, Sort, or array');
          }
        } else if (arguments.length === 2) {
          // handle the case where a single field name and order are passed
          var field = arguments[0],
            order = arguments[1];

          if (isString(field) && isString(order)) {
            order = order.toLowerCase();
            if (order === 'asc' || order === 'desc') {
              var sortObj = {};
              sortObj[field] = {order: order};
              query.sort.push(sortObj);
            }
          }
        }

        return this;
      },

      /**
           Enables score computation and tracking during sorting.  Be default,
           when sorting scores are not computed.

            @member ejs.Request
            @param {Boolean} trueFalse If scores should be computed and tracked.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      trackScores: function (trueFalse) {
        if (trueFalse == null) {
          return query.track_scores;
        }

        query.track_scores = trueFalse;
        return this;
      },

      /**
            A search result set could be very large (think Google). Setting the
            <code>from</code> parameter allows you to page through the result set
            by making multiple request. This parameters specifies the starting
            result/document number point. Combine with <code>size()</code> to achieve paging.

            @member ejs.Request
            @param {Array} f The offset at which to start fetching results/documents from the result set.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      from: function (f) {
        if (f == null) {
          return query.from;
        }

        query.from = f;
        return this;
      },

      /**
            Sets the number of results/documents to be returned. This is set on a per page basis.

            @member ejs.Request
            @param {Integer} s The number of results that are to be returned by the search.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      size: function (s) {
        if (s == null) {
          return query.size;
        }

        query.size = s;
        return this;
      },

      /**
            A timeout, bounding the request to be executed within the
            specified time value and bail when expired. Defaults to no timeout.

            <p>This option is valid during the following operations:
                <code>search</code> and <code>delete by query</code></p>

            @member ejs.Request
            @param {Long} t The timeout value in milliseconds.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      timeout: function (t) {
        if (t == null) {
          return query.timeout;
        }

        query.timeout = t;
        return this;
      },


      /**
            By default, searches return full documents, meaning every property or field.
            This method allows you to specify which fields you want returned.

            Pass a single field name and it is appended to the current list of
            fields.  Pass an array of fields and it replaces all existing
            fields.

            @member ejs.Request
            @param {(String|String[])} s The field as a string or fields as array
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      fields: function (fieldList) {
        if (fieldList == null) {
          return query.fields;
        }

        if (query.fields == null) {
          query.fields = [];
        }

        if (isString(fieldList)) {
          query.fields.push(fieldList);
        } else if (isArray(fieldList)) {
          query.fields = fieldList;
        } else {
          throw new TypeError('Argument must be a string or an array');
        }

        return this;
      },

      /**
            Allows to control how the _source field is returned with every hit.
            By default operations return the contents of the _source field
            unless you have used the fields parameter or if the _source field
            is disabled.  Set the includes parameter to false to completely
            disable returning the source field.

            @member ejs.Request
            @param {(String|Boolean|String[])} includes The field or list of fields to include as array.
              Set to a boolean false to disable the source completely.
            @param {(String|String[])} excludes The  optional field or list of fields to exclude.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      source: function (includes, excludes) {
        if (includes == null && excludes == null) {
          return query._source;
        }

        if (!isArray(includes) && !isString(includes) && !isBoolean(includes)) {
          throw new TypeError('Argument includes must be a string, an array, or a boolean');
        }

        if (excludes != null && !isArray(excludes) && !isString(excludes)) {
          throw new TypeError('Argument excludes must be a string or an array');
        }

        if (isBoolean(includes)) {
          query._source = includes;
        } else {
          query._source = {
            includes: includes
          };

          if (excludes != null) {
            query._source.excludes = excludes;
          }
        }

        return this;
      },

      /**
            Once a query executes, you can use rescore to run a secondary, more
            expensive query to re-order the results.

            @member ejs.Request
            @param {Rescore} r The rescore configuration.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      rescore: function (r) {
        if (r == null) {
          return query.rescore;
        }

        if (!isRescore(r)) {
          throw new TypeError('Argument must be a Rescore');
        }

        query.rescore = r.toJSON();

        return this;
      },

      /**
            Allows you to set the specified query on this search object. This is the
            query that will be used when the search is executed.

            @member ejs.Request
            @param {Query} someQuery Any valid <code>Query</code> object.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      query: function (someQuery) {
        if (someQuery == null) {
          return query.query;
        }

        if (!isQuery(someQuery)) {
          throw new TypeError('Argument must be a Query');
        }

        query.query = someQuery.toJSON();
        return this;
      },

      /**
            Allows you to set the specified facet on this request object. Multiple facets can
            be set, all of which will be returned when the search is executed.

            @member ejs.Request
            @param {Facet} facet Any valid <code>Facet</code> object.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      facet: function (facet) {
        if (facet == null) {
          return query.facets;
        }

        if (query.facets == null) {
          query.facets = {};
        }

        if (!isFacet(facet)) {
          throw new TypeError('Argument must be a Facet');
        }

        extend(query.facets, facet.toJSON());

        return this;
      },

      /**
      Add an aggregation.  This method can be called multiple times
      in order to set multiple nested aggregations that will be executed
      at the same time as the search request.

      @member ejs.Request
      @param {Aggregation} agg Any valid <code>Aggregation</code> object.
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      aggregation: function(agg) {
        if (agg == null) {
          return query.aggs;
        }

        if (query.aggs == null) {
          query.aggs = {};
        }

        if (!isAggregation(agg)) {
          throw new TypeError('Argument must be an Aggregation');
        }

        extend(query.aggs, agg.toJSON());

        return this;
      },

      /**
      Add an aggregation.  This method can be called multiple times
      in order to set multiple nested aggregations that will be executed
      at the same time as the search request.  Alias for the aggregation method.

      @member ejs.Request
      @param {Aggregation} agg Any valid <code>Aggregation</code> object.
      @returns {Object} returns <code>this</code> so that calls can be chained.
      */
      agg: function(agg) {
        return this.aggregation(agg);
      },

      /**
            Allows you to set a specified filter on this request object.

            @member ejs.Request
            @param {Object} filter Any valid <code>Filter</code> object.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      filter: function (filter) {
        if (filter == null) {
          return query.filter;
        }

        if (!isFilter(filter)) {
          throw new TypeError('Argument must be a Filter');
        }

        query.filter = filter.toJSON();
        return this;
      },

      /**
            Performs highlighting based on the <code>Highlight</code>
            settings.

            @member ejs.Request
            @param {Highlight} h A valid Highlight object
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      highlight: function (h) {
        if (h == null) {
          return query.highlight;
        }

        if (!isHighlight(h)) {
          throw new TypeError('Argument must be a Highlight object');
        }

        query.highlight = h.toJSON();
        return this;
      },

      /**
            Allows you to set the specified suggester on this request object.
            Multiple suggesters can be set, all of which will be returned when
            the search is executed.  Global suggestion text can be set by
            passing in a string vs. a <code>Suggest</code> object.

            @since elasticsearch 0.90

            @member ejs.Request
            @param {(String|Suggest)} s A valid Suggest object or a String to
              set as the global suggest text.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      suggest: function (s) {
        if (s == null) {
          return query.suggest;
        }

        if (query.suggest == null) {
          query.suggest = {};
        }

        if (isString(s)) {
          query.suggest.text = s;
        } else if (isSuggest(s)) {
          extend(query.suggest, s.toJSON());
        } else {
          throw new TypeError('Argument must be a string or Suggest object');
        }

        return this;
      },

      /**
            Computes a document property dynamically based on the supplied <code>ScriptField</code>.

            @member ejs.Request
            @param {ScriptField} oScriptField A valid <code>ScriptField</code>.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      scriptField: function (oScriptField) {
        if (oScriptField == null) {
          return query.script_fields;
        }

        if (query.script_fields == null) {
          query.script_fields = {};
        }

        if (!isScriptField(oScriptField)) {
          throw new TypeError('Argument must be a ScriptField');
        }

        extend(query.script_fields, oScriptField.toJSON());
        return this;
      },

      /**
            Boosts hits in the specified index by the given boost value.

            @member ejs.Request
            @param {String} index the index to boost
            @param {Double} boost the boost value
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      indexBoost: function (index, boost) {
        if (query.indices_boost == null) {
          query.indices_boost = {};
        }

        if (arguments.length === 0) {
          return query.indices_boost;
        }

        query.indices_boost[index] = boost;
        return this;
      },

      /**
            Enable/Disable explanation of score for each search result.

            @member ejs.Request
            @param {Boolean} trueFalse true to enable, false to disable
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      explain: function (trueFalse) {
        if (trueFalse == null) {
          return query.explain;
        }

        query.explain = trueFalse;
        return this;
      },

      /**
            Enable/Disable returning version number for each search result.

            @member ejs.Request
            @param {Boolean} trueFalse true to enable, false to disable
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      version: function (trueFalse) {
        if (trueFalse == null) {
          return query.version;
        }

        query.version = trueFalse;
        return this;
      },

      /**
            Filters out search results will scores less than the specified minimum score.

            @member ejs.Request
            @param {Double} min a positive <code>double</code> value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      minScore: function (min) {
        if (min == null) {
          return query.min_score;
        }

        query.min_score = min;
        return this;
      },

      /**
            The type of ejs object.  For internal use only.

            @member ejs.Request
            @returns {String} the type of object
            */
      _type: function () {
        return 'request';
      },

      /**
            Retrieves the internal <code>query</code> object. This is typically used by
            internal API functions so use with caution.

            @member ejs.Request
            @returns {String} returns this object's internal object representation.
            */
      toJSON: function () {
        return query;
      }

    };
  };

  /**
    @class
    <p>A method that allows to rescore queries with a typically more expensive.</p>

    @name ejs.Rescore
    @ejs request

    @desc
    <p>Defines an operation that rescores a query with another query.</p>

    @param {Number} windowSize The optional number of documents to reorder per shard.
    @param {Query} windowSize The optional query to use for rescoring.

    */
  ejs.Rescore = function (windowSize, qry) {

    if (windowSize != null && !isNumber(windowSize)) {
      throw new TypeError('Argument must be a Number');
    }
    
    if (qry != null && !isQuery(qry)) {
      throw new TypeError('Argument must be a Query');
    }
    
    var rescore = {
      query: {}
    };

    if (windowSize != null) {
      rescore.window_size = windowSize;
    }
    
    if (qry != null) {
      rescore.query.rescore_query = qry.toJSON();
    }
    
    return {

      /**
            Sets the query used by the rescoring.

            @member ejs.Rescore
            @param {Query} someQuery a valid query.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      rescoreQuery: function (someQuery) {
        if (someQuery == null) {
          return rescore.query.rescore_query;
        }

        if (!isQuery(someQuery)) {
          throw new TypeError('Argument must be a Query');
        }

        rescore.query.rescore_query = someQuery.toJSON();
        return this;
      },

      /**
            Sets the weight assigned to the original query of the rescoring.

            @member ejs.Rescore
            @param {Number} weight a valid query weight.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      queryWeight: function (weight) {
        if (weight == null) {
          return rescore.query.query_weight;
        }

        if (!isNumber(weight)) {
          throw new TypeError('Argument must be a Number');
        }

        rescore.query.query_weight = weight;
        return this;
      },

      /**
            Sets the weight assigned to the query used to rescore the original query.

            @member ejs.Rescore
            @param {Number} weight a valid rescore query weight.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      rescoreQueryWeight: function (weight) {
        if (weight == null) {
          return rescore.query.rescore_query_weight;
        }

        if (!isNumber(weight)) {
          throw new TypeError('Argument must be a Number');
        }

        rescore.query.rescore_query_weight = weight;
        return this;
      },

      /**
            Sets the window_size parameter of the rescoring.

            @member ejs.Rescore
            @param {Number} size a valid window size.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      windowSize: function (size) {
        if (size == null) {
          return rescore.window_size;
        }

        if (!isNumber(size)) {
          throw new TypeError('Argument must be a Number');
        }

        rescore.window_size = size;
        return this;
      },

      /**
            Sets the scoring mode.  Valid values are:
            
            total - default mode, the scores combined
            multiply - the scores multiplied
            min - the lowest of the scores
            max - the highest score 
            avg - the average of the scores

            @member ejs.Rescore
            @param {String} s The score mode as a string.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      scoreMode: function (s) {
        if (s == null) {
          return rescore.query.score_mode;
        }
    
        s = s.toLowerCase();
        if (s === 'total' || s === 'min' || s === 'max' || s === 'multiply' || 
          s === 'avg') {
          rescore.query.score_mode = s;
        }
        
        return this;
      },

      /**
            The type of ejs object.  For internal use only.

            @member ejs.Rescore
            @returns {String} the type of object
            */
      _type: function () {
        return 'rescore';
      },

      /**
            Retrieves the internal <code>script</code> object. This is typically used by
            internal API functions so use with caution.

            @member ejs.Rescore
            @returns {String} returns this object's internal object representation.
            */
      toJSON: function () {
        return rescore;
      }
    };
  };
  /**
    @class
    <p>ScriptField's allow you create dynamic fields on stored documents at query
    time. For example, you might have a set of document thats containsthe fields
    <code>price</code> and <code>quantity</code>. At query time, you could define a computed
    property that dynamically creates a new field called <code>total</code>in each document
    based on the calculation <code>price * quantity</code>.</p>

    @name ejs.ScriptField
    @ejs request

    @desc
    <p>Computes dynamic document properties based on information from other fields.</p>

    @param {String} fieldName A name of the script field to create.

    */
  ejs.ScriptField = function (fieldName) {
    var script = {};

    script[fieldName] = {};

    return {

      /**
            The script language being used. Currently supported values are
            <code>javascript</code> and <code>mvel</code>.

            @member ejs.ScriptField
            @param {String} language The language of the script.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      lang: function (language) {
        if (language == null) {
          return script[fieldName].lang;
        }
      
        script[fieldName].lang = language;
        return this;
      },

      /**
            Sets the script/code that will be used to perform the calculation.

            @member ejs.ScriptField
            @param {String} expression The script/code to use.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      script: function (expression) {
        if (expression == null) {
          return script[fieldName].script;
        }
      
        script[fieldName].script = expression;
        return this;
      },

      /**
            Allows you to set script parameters to be used during the execution of the script.

            @member ejs.ScriptField
            @param {Object} oParams An object containing key/value pairs representing param name/value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      params: function (oParams) {
        if (oParams == null) {
          return script[fieldName].params;
        }
      
        script[fieldName].params = oParams;
        return this;
      },

      /**
            If execeptions thrown from the script should be ignored or not.
            Default: false

            @member ejs.ScriptField
            @param {Boolean} trueFalse if execptions should be ignored
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      ignoreFailure: function (trueFalse) {
        if (trueFalse == null) {
          return script[fieldName].ignore_failure;
        }
        
        script[fieldName].ignore_failure = trueFalse;
        return this;
      },

      /**
            The type of ejs object.  For internal use only.
            
            @member ejs.ScriptField
            @returns {String} the type of object
            */
      _type: function () {
        return 'script field';
      },
      
      /**
            Retrieves the internal <code>script</code> object. This is typically used by
            internal API functions so use with caution.

            @member ejs.ScriptField
            @returns {String} returns this object's internal <code>facet</code> property.
            */
      toJSON: function () {
        return script;
      }
    };
  };

  /**
    @class
    <p>A Shape object that can be used in queries and filters that 
    take a Shape.  Shape uses the GeoJSON format.</p>

    <p>See http://www.geojson.org/</p>

    @name ejs.Shape
    @ejs geo

    @desc
    <p>Defines a shape</p>

    @param {String} type A valid shape type.
    @param {Array} coords An valid coordinat definition for the given shape.

    */
  ejs.Shape = function (type, coords) {
  
    var 
      shape = {},
      validType = function (t) {
        var valid = false;
        if (t === 'point' || t === 'linestring' || t === 'polygon' || 
          t === 'multipoint' || t === 'envelope' || t === 'multipolygon' ||
          t === 'circle' || t === 'multilinestring') {
          valid = true;
        }

        return valid;
      };
    
    type = type.toLowerCase();
    if (validType(type)) {
      shape.type = type;
      shape.coordinates = coords;
    }  
  
    return {

      /**
            Sets the shape type.  Can be set to one of:  point, linestring, polygon,
            multipoint, envelope, or multipolygon.

            @member ejs.Shape
            @param {String} t a valid shape type.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      type: function (t) {
        if (t == null) {
          return shape.type;
        }
      
        t = t.toLowerCase();
        if (validType(t)) {
          shape.type = t;
        }
      
        return this;
      },

      /**
            Sets the coordinates for the shape definition.  Note, the coordinates
            are not validated in this api.  Please see GeoJSON and ElasticSearch
            documentation for correct coordinate definitions.

            @member ejs.Shape
            @param {Array} c a valid coordinates definition for the shape.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      coordinates: function (c) {
        if (c == null) {
          return shape.coordinates;
        }

        shape.coordinates = c;
        return this;
      },
      
      /**
            Sets the radius for parsing a circle <code>Shape</code>.

            @member ejs.Shape
            @param {String} r a valid radius value for a circle.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      radius: function (r) {
        if (r == null) {
          return shape.radius;
        }
        
        shape.radius = r;
        return this;
      },

      /**
            The type of ejs object.  For internal use only.
            
            @member ejs.Shape
            @returns {String} the type of object
            */
      _type: function () {
        return 'shape';
      },
      
      /**
            Retrieves the internal <code>script</code> object. This is typically used by
            internal API functions so use with caution.

            @member ejs.Shape
            @returns {String} returns this object's internal object representation.
            */
      toJSON: function () {
        return shape;
      }
    };
  };

  /**
    @class
    <p>A Sort object that can be used in on the Request object to specify 
    various types of sorting.</p>

    <p>See http://www.elasticsearch.org/guide/reference/api/search/sort.html</p>

    @name ejs.Sort
    @ejs request

    @desc
    <p>Defines a sort value</p>

    @param {String} fieldName The fieldName to sort against.  Defaults to _score
      if not specified.
    */
  ejs.Sort = function (fieldName) {

    // default to sorting against the documents score.
    if (fieldName == null) {
      fieldName = '_score';
    }
  
    var sort = {},
      key = fieldName, // defaults to field search
      geo_key = '_geo_distance', // used when doing geo distance sort
      script_key = '_script'; // used when doing script sort
    
    // defaults to a field sort
    sort[key] = {};

    return {

      /**
            Set's the field to sort on

            @member ejs.Sort
            @param {String} f The name of a field 
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      field: function (f) {
        var oldValue = sort[key];
      
        if (f == null) {
          return fieldName;
        }
    
        delete sort[key];      
        fieldName = f;
        key = f;
        sort[key] = oldValue;
      
        return this;
      },

      /**
            Enables sorting based on a distance from a GeoPoint

            @member ejs.Sort
            @param {GeoPoint} point A valid GeoPoint object
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      geoDistance: function (point) {
        var oldValue = sort[key];
      
        if (point == null) {
          return sort[key][fieldName];
        }
    
        if (!isGeoPoint(point)) {
          throw new TypeError('Argument must be a GeoPoint');
        }
      
        delete sort[key];
        key = geo_key;
        sort[key] = oldValue;
        sort[key][fieldName] = point.toJSON();
      
        return this;
      },
    
      /**
            Enables sorting based on a script.

            @member ejs.Sort
            @param {String} scriptCode The script code as a string
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      script: function (scriptCode) {
        var oldValue = sort[key];
      
        if (scriptCode == null) {
          return sort[key].script;
        }
      
        delete sort[key];
        key = script_key;
        sort[key] = oldValue;
        sort[key].script = scriptCode;
      
        return this;
      },
    
      /**
            Sets the sort order.  Valid values are:
          
            asc - for ascending order
            desc - for descending order

            Valid during sort types:  field, geo distance, and script
          
            @member ejs.Sort
            @param {String} o The sort order as a string, asc or desc.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      order: function (o) {
        if (o == null) {
          return sort[key].order;
        }
    
        o = o.toLowerCase();
        if (o === 'asc' || o === 'desc') {
          sort[key].order = o;  
        }
      
        return this;
      },
    
      /**
            Sets the sort order to ascending (asc).  Same as calling
            <code>order('asc')</code>.
          
            @member ejs.Sort
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      asc: function () {
        sort[key].order = 'asc';
        return this;
      },
      
      /**
            Sets the sort order to descending (desc).  Same as calling
            <code>order('desc')</code>.
          
            @member ejs.Sort
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      desc: function () {
        sort[key].order = 'desc';
        return this;
      },
      
      /**
            Sets the order with a boolean value.  
          
            true = descending sort order
            false = ascending sort order

            Valid during sort types:  field, geo distance, and script
          
            @member ejs.Sort
            @param {Boolean} trueFalse If sort should be in reverse order.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      reverse: function (trueFalse) {
        if (trueFalse == null) {
          return sort[key].reverse;
        }
    
        sort[key].reverse = trueFalse;  
        return this;
      },
    
      /**
            Sets the value to use for missing fields.  Valid values are:
          
            _last - to put documents with the field missing last
            _first - to put documents with the field missing first
            {String} - any string value to use as the sort value.

            Valid during sort types:  field
          
            @member ejs.Sort
            @param {String} m The value to use for documents with the field missing.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      missing: function (m) {
        if (m == null) {
          return sort[key].missing;
        }
    
        sort[key].missing = m;  
        return this;
      },
    
      /**
            Sets if the sort should ignore unmapped fields vs throwing an error.

            Valid during sort types:  field
          
            @member ejs.Sort
            @param {Boolean} trueFalse If sort should ignore unmapped fields.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      ignoreUnmapped: function (trueFalse) {
        if (trueFalse == null) {
          return sort[key].ignore_unmapped;
        }
    
        sort[key].ignore_unmapped = trueFalse;  
        return this;
      },
    
      /**
             Sets the distance unit.  Valid values are "mi" for miles or "km"
             for kilometers. Defaults to "km".

             Valid during sort types:  geo distance
           
             @member ejs.Sort
             @param {Number} unit the unit of distance measure.
             @returns {Object} returns <code>this</code> so that calls can be chained.
             */
      unit: function (unit) {
        if (unit == null) {
          return sort[key].unit;
        }
    
        unit = unit.toLowerCase();
        if (unit === 'mi' || unit === 'km') {
          sort[key].unit = unit;
        }
      
        return this;
      },
    
      /**
            If the lat/long points should be normalized to lie within their
            respective normalized ranges.
          
            Normalized ranges are:
            lon = -180 (exclusive) to 180 (inclusive) range
            lat = -90 to 90 (both inclusive) range

            Valid during sort types:  geo distance
          
            @member ejs.Sort
            @param {String} trueFalse True if the coordinates should be normalized. False otherwise.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      normalize: function (trueFalse) {
        if (trueFalse == null) {
          return sort[key].normalize;
        }

        sort[key].normalize = trueFalse;
        return this;
      },
    
      /**
            How to compute the distance. Can either be arc (better precision) 
            or plane (faster). Defaults to arc.

            Valid during sort types:  geo distance
          
            @member ejs.Sort
            @param {String} type The execution type as a string.  
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      distanceType: function (type) {
        if (type == null) {
          return sort[key].distance_type;
        }

        type = type.toLowerCase();
        if (type === 'arc' || type === 'plane') {
          sort[key].distance_type = type;
        }
      
        return this;
      },
    
      /**
            Sets parameters that will be applied to the script.  Overwrites 
            any existing params.

            Valid during sort types:  script
          
            @member ejs.Sort
            @param {Object} p An object where the keys are the parameter name and 
              values are the parameter value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      params: function (p) {
        if (p == null) {
          return sort[key].params;
        }
  
        sort[key].params = p;
        return this;
      },
  
      /**
            Sets the script language.

            Valid during sort types:  script
          
            @member ejs.Sort
            @param {String} lang The script language, default mvel.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      lang: function (lang) {
        if (lang == null) {
          return sort[key].lang;
        }

        sort[key].lang = lang;
        return this;
      },
    
      /**
            Sets the script sort type.  Valid values are:
          
            <dl>
                <dd><code>string</code> - script return value is sorted as a string</dd>
                <dd><code>number</code> - script return value is sorted as a number</dd>
            <dl>

            Valid during sort types:  script
          
            @member ejs.Sort
            @param {String} type The sort type.  Either string or number.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      type: function (type) {
        if (type == null) {
          return sort[key].type;
        }

        type = type.toLowerCase();
        if (type === 'string' || type === 'number') {
          sort[key].type = type;
        }
      
        return this;
      },

      /**
            Sets the sort mode.  Valid values are:
          
            <dl>
                <dd><code>min</code> - sort by lowest value</dd>
                <dd><code>max</code> - sort by highest value</dd>
                <dd><code>sum</code> - sort by the sum of all values</dd>
                <dd><code>avg</code> - sort by the average of all values</dd>
            <dl>
            
            Valid during sort types:  field, geo distance
          
            @since elasticsearch 0.90
            @member ejs.Sort
            @param {String} m The sort mode.  Either min, max, sum, or avg.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      mode: function (m) {
        if (m == null) {
          return sort[key].mode;
        }

        m = m.toLowerCase();
        if (m === 'min' || m === 'max' || m === 'sum' || m === 'avg') {
          sort[key].mode = m;
        }
      
        return this;
      },
      
      /**
            Sets the path of the nested object.

            Valid during sort types:  field, geo distance
          
            @since elasticsearch 0.90
            @member ejs.Sort
            @param {String} path The nested path value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      nestedPath: function (path) {
        if (path == null) {
          return sort[key].nested_path;
        }

        sort[key].nested_path = path;
        return this;
      },
      
      /**
            <p>Allows you to set a filter that nested objects must match
            in order to be considered during sorting.</p>

            Valid during sort types: field, geo distance
            
            @since elasticsearch 0.90
            @member ejs.Sort
            @param {Object} oFilter A valid <code>Filter</code> object.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      nestedFilter: function (oFilter) {
        if (oFilter == null) {
          return sort[key].nested_filter;
        }
      
        if (!isFilter(oFilter)) {
          throw new TypeError('Argument must be a Filter');
        }
        
        sort[key].nested_filter = oFilter.toJSON();
        return this;
      },

      /**
            The type of ejs object.  For internal use only.
          
            @member ejs.Sort
            @returns {String} the type of object
            */
      _type: function () {
        return 'sort';
      },
    
      /**
            Retrieves the internal <code>script</code> object. This is typically used by
            internal API functions so use with caution.

            @member ejs.Sort
            @returns {String} returns this object's internal object representation.
            */
      toJSON: function () {
        return sort;
      }
    };
  };

  /**
    @class
    @suggester
    <p>The completion suggester is a so-called prefix suggester. It does not do spell 
    correction like the term or phrase suggesters but allows basic auto-complete functionality.</p>

    @name ejs.CompletionSuggester
    @ejs suggest
    @borrows ejs.SuggesterMixin.text as text
    @borrows ejs.SuggesterMixin._type as _type
    @borrows ejs.SuggesterMixin.toJSON as toJSON
    @borrows ejs.SuggestContextMixin.analyzer as analyzer
    @borrows ejs.SuggestContextMixin.field as field
    @borrows ejs.SuggestContextMixin.size as size
    @borrows ejs.SuggestContextMixin.shardSize as shardSize
  
    @since elasticsearch 0.90.4
  
    @desc
    <p>A suggester that allows basic auto-complete functionality.</p>

    @param {String} name The name which be used to refer to this suggester.
    */
  ejs.CompletionSuggester = function (name) {

    var
      _context,
      _common = ejs.SuggesterMixin(name),
      suggest = _common.toJSON();
    
    suggest[name].completion = {};
    _context = ejs.SuggestContextMixin(suggest[name].completion);
  
    return extend(_common, _context, {
    
      /**
            <p>Enable fuzzy completions which means a can spell a word
            incorrectly and still get a suggestion.</p>

            @member ejs.CompletionSuggester
            @param {Boolean} trueFalse true to enable fuzzy completions, false to disable.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      fuzzy: function (trueFalse) {
        if (trueFalse == null) {
          return suggest[name].completion.fuzzy;
        }
      
        if (trueFalse && suggest[name].completion.fuzzy == null) {
          suggest[name].completion.fuzzy = {};
        } else if (!trueFalse && suggest[name].completion.fuzzy != null) {
          delete suggest[name].completion.fuzzy;
        }
      
        return this;
      },
    
      /**
            <p>Sets if transpositions should be counted as one or two changes, defaults 
            to true when fuzzy is enabled.  Automatically enables fuzzy suggestions
            when set to any value.</p>

            @member ejs.CompletionSuggester
            @param {Boolean} trueFalse true to enable transpositions.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      transpositions: function (trueFalse) {
        if (suggest[name].completion.fuzzy == null) {
          suggest[name].completion.fuzzy = {};
        }
      
        if (trueFalse == null) {
          return suggest[name].completion.fuzzy.transpositions;
        }
      
        suggest[name].completion.fuzzy.transpositions = trueFalse;
        return this;
      },
    
      /**
            <p>Sets all are measurements (like edit distance, transpositions and lengths) 
            in unicode code points (actual letters) instead of bytes.  Automatically 
            enables fuzzy suggestions when set to any value.</p>

            @member ejs.CompletionSuggester
            @param {Boolean} trueFalse true to set unicode aware, false to disable.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      unicodeAware: function (trueFalse) {
        if (suggest[name].completion.fuzzy == null) {
          suggest[name].completion.fuzzy = {};
        }
      
        if (trueFalse == null) {
          return suggest[name].completion.fuzzy.unicode_aware;
        }
      
        suggest[name].completion.fuzzy.unicode_aware = trueFalse;
        return this;
      },
    
      /**
            <p>Maximum edit distance (fuzziness), defaults to 1.  Automatically 
            enables fuzzy suggestions when set to any value.</p>

            @member ejs.CompletionSuggester
            @param {Integer} d A positive integer value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      editDistance: function (d) {
        if (suggest[name].completion.fuzzy == null) {
          suggest[name].completion.fuzzy = {};
        }
      
        if (d == null) {
          return suggest[name].completion.fuzzy.edit_distance;
        }
      
        suggest[name].completion.fuzzy.edit_distance = d;
        return this;
      },
    
      /**
            <p>Minimum length of the input before fuzzy suggestions are returned, defaults 
            to 3.  Automatically enables fuzzy suggestions when set to any value.</p>

            @member ejs.CompletionSuggester
            @param {Integer} m A positive integer value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      minLength: function (m) {
        if (suggest[name].completion.fuzzy == null) {
          suggest[name].completion.fuzzy = {};
        }
      
        if (m == null) {
          return suggest[name].completion.fuzzy.min_length;
        }
      
        suggest[name].completion.fuzzy.min_length = m;
        return this;
      },
    
      /**
            <p>Minimum length of the input, which is not checked for fuzzy alternatives, defaults 
            to 1.  Automatically enables fuzzy suggestions when set to any value.</p>

            @member ejs.CompletionSuggester
            @param {Integer} l A positive integer value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      prefixLength: function (l) {
        if (suggest[name].completion.fuzzy == null) {
          suggest[name].completion.fuzzy = {};
        }
      
        if (l == null) {
          return suggest[name].completion.fuzzy.prefix_length;
        }
      
        suggest[name].completion.fuzzy.prefix_length = l;
        return this;
      }
    
    });
  };

  /**
    @class
    <p>DirectGenerator is a candidate generator for <code>PhraseSuggester</code>.
    It generates terms based on edit distance and operators much like the
    <code>TermSuggester</code>.</p>

    @name ejs.DirectGenerator
    @ejs suggest
    @borrows ejs.DirectSettingsMixin.accuracy as accuracy
    @borrows ejs.DirectSettingsMixin.suggestMode as suggestMode
    @borrows ejs.DirectSettingsMixin.sort as sort
    @borrows ejs.DirectSettingsMixin.stringDistance as stringDistance
    @borrows ejs.DirectSettingsMixin.maxEdits as maxEdits
    @borrows ejs.DirectSettingsMixin.maxInspections as maxInspections
    @borrows ejs.DirectSettingsMixin.maxTermFreq as maxTermFreq
    @borrows ejs.DirectSettingsMixin.prefixLength as prefixLength
    @borrows ejs.DirectSettingsMixin.minWordLen as minWordLen
    @borrows ejs.DirectSettingsMixin.minDocFreq as minDocFreq

    @since elasticsearch 0.90
  
    @desc
    <p>A candidate generator that generates terms based on edit distance.</p>
  
    */
  ejs.DirectGenerator = function () {

  
    var
  
    generator = {},
    _common = ejs.DirectSettingsMixin(generator);
    
    return extend(_common, {

      /**
            <p>Sets an analyzer that is applied to each of the tokens passed to 
            this generator.  The analyzer is applied to the original tokens,
            not the generated tokens.</p>

            @member ejs.DirectGenerator
            @param {String} analyzer A valid analyzer name.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      preFilter: function (analyzer) {
        if (analyzer == null) {
          return generator.pre_filter;
        }
  
        generator.pre_filter = analyzer;
        return this;
      },
    
      /**
            <p>Sets an analyzer that is applied to each of the generated tokens 
            before they are passed to the actual phrase scorer.</p>

            @member ejs.DirectGenerator
            @param {String} analyzer A valid analyzer name.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      postFilter: function (analyzer) {
        if (analyzer == null) {
          return generator.post_filter;
        }
  
        generator.post_filter = analyzer;
        return this;
      },
    
      /**
            <p>Sets the field used to generate suggestions from.</p>

            @member ejs.DirectGenerator
            @param {String} field A valid field name.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      field: function (field) {
        if (field == null) {
          return generator.field;
        }
  
        generator.field = field;
        return this;
      },
    
      /**
            <p>Sets the number of suggestions returned for each token.</p>

            @member ejs.DirectGenerator
            @param {Integer} s A positive integer value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      size: function (s) {
        if (s == null) {
          return generator.size;
        }
  
        generator.size = s;
        return this;
      },

      /**
            The type of ejs object.  For internal use only.
        
            @member ejs.DirectGenerator
            @returns {String} the type of object
            */
      _type: function () {
        return 'generator';
      },
  
      /**
            <p>Retrieves the internal <code>generator</code> object. This is typically used by
               internal API functions so use with caution.</p>

            @member ejs.DirectGenerator
            @returns {String} returns this object's internal <code>generator</code> property.
            */
      toJSON: function () {
        return generator;
      }
    });
  };

  /**
    @class
    <p>PhraseSuggester extends the <code>PhraseSuggester</code> and suggests
    entire corrected phrases instead of individual tokens.  The individual
    phrase suggestions are weighted based on ngram-langugage models. In practice
    it will be able to make better decision about which tokens to pick based on
    co-occurence and frequencies.</p>

    @name ejs.PhraseSuggester
    @ejs suggest
    @borrows ejs.SuggesterMixin.text as text
    @borrows ejs.SuggesterMixin._type as _type
    @borrows ejs.SuggesterMixin.toJSON as toJSON
    @borrows ejs.SuggestContextMixin.analyzer as analyzer
    @borrows ejs.SuggestContextMixin.field as field
    @borrows ejs.SuggestContextMixin.size as size
    @borrows ejs.SuggestContextMixin.shardSize as shardSize

    @since elasticsearch 0.90

    @desc
    <p>A suggester that suggests entire corrected phrases.</p>

    @param {String} name The name which be used to refer to this suggester.
    */
  ejs.PhraseSuggester = function (name) {

    var
      _context,
      _common = ejs.SuggesterMixin(name),
      suggest = _common.toJSON();

    suggest[name].phrase = {};
    _context = ejs.SuggestContextMixin(suggest[name].phrase);

    return extend(_common, _context, {

      /**
            <p>Sets the likelihood of a term being a misspelled even if the
            term exists in the dictionary. The default it 0.95 corresponding
            to 5% or the real words are misspelled.</p>

            @member ejs.PhraseSuggester
            @param {Double} l A positive double value greater than 0.0.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      realWordErrorLikelihood: function (l) {
        if (l == null) {
          return suggest[name].phrase.real_word_error_likelihood;
        }

        suggest[name].phrase.real_word_error_likelihood = l;
        return this;
      },

      /**
            <p>Sets the confidence level defines a factor applied to the input
            phrases score which is used as a threshold for other suggest
            candidates. Only candidates that score higher than the threshold
            will be included in the result.</p>

            @member ejs.PhraseSuggester
            @param {Double} c A positive double value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      confidence: function (c) {
        if (c == null) {
          return suggest[name].phrase.confidence;
        }

        suggest[name].phrase.confidence = c;
        return this;
      },

      /**
            <p>Sets the separator that is used to separate terms in the bigram
            field. If not set the whitespce character is used as a
            separator.</p>

            @member ejs.PhraseSuggester
            @param {String} sep A string separator.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      separator: function (sep) {
        if (sep == null) {
          return suggest[name].phrase.separator;
        }

        suggest[name].phrase.separator = sep;
        return this;
      },

      /**
            <p>Sets the maximum percentage of the terms that at most
            considered to be misspellings in order to form a correction.</p>

            @member ejs.PhraseSuggester
            @param {Double} c A positive double value greater between 0 and 1.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      maxErrors: function (max) {
        if (max == null) {
          return suggest[name].phrase.max_errors;
        }

        suggest[name].phrase.max_errors = max;
        return this;
      },

      /**
            <p>Sets the max size of the n-grams (shingles) in the field. If
            the field doesn't contain n-grams (shingles) this should be
            omitted or set to 1.</p>

            @member ejs.PhraseSuggester
            @param {Integer} s A positive integer value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      gramSize: function (s) {
        if (s == null) {
          return suggest[name].phrase.gram_size;
        }

        suggest[name].phrase.gram_size = s;
        return this;
      },

      /**
            <p>Forces the use of unigrams.</p>

            @member ejs.PhraseSuggester
            @param {Boolean} trueFalse True to force unigrams, false otherwise.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      forceUnigrams: function (trueFalse) {
        if (trueFalse == null) {
          return suggest[name].phrase.force_unigrams;
        }

        suggest[name].phrase.force_unigrams = trueFalse;
        return this;
      },

      /**
            <p>Sets the token limit.</p>

            @member ejs.PhraseSuggester
            @param {Integer} l A positive integer value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      tokenLimit: function (l) {
        if (l == null) {
          return suggest[name].phrase.token_limit;
        }

        suggest[name].phrase.token_limit = l;
        return this;
      },

      /**
            <p>A smoothing model that takes the weighted mean of the unigrams,
            bigrams and trigrams based on user supplied weights (lambdas). The
            sum of tl, bl, and ul must equal 1.</p>

            @member ejs.PhraseSuggester
            @param {Double} tl A positive double value used for trigram weight.
            @param {Double} bl A positive double value used for bigram weight.
            @param {Double} ul A positive double value used for unigram weight.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      linearSmoothing: function (tl, bl, ul) {
        if (arguments.length === 0) {
          return suggest[name].phrase.smoothing;
        }

        suggest[name].phrase.smoothing = {
          linear: {
            trigram_lambda: tl,
            bigram_lambda: bl,
            unigram_lambda: ul
          }
        };

        return this;
      },

      /**
            <p>A smoothing model that uses an additive smoothing model where a
            constant (typically 1.0 or smaller) is added to all counts to
            balance weights, The default alpha is 0.5.</p>

            @member ejs.PhraseSuggester
            @param {Double} alpha A double value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      laplaceSmoothing: function (alpha) {
        if (alpha == null) {
          return suggest[name].phrase.smoothing;
        }

        suggest[name].phrase.smoothing = {
          laplace: {
            alpha: alpha
          }
        };

        return this;
      },

      /**
            <p>A simple backoff model that backs off to lower order n-gram
            models if the higher order count is 0 and discounts the lower
            order n-gram model by a constant factor. The default discount is
            0.4.</p>

            @member ejs.PhraseSuggester
            @param {Double} discount A double value.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      stupidBackoffSmoothing: function (discount) {
        if (discount == null) {
          return suggest[name].phrase.smoothing;
        }

        suggest[name].phrase.smoothing = {
          stupid_backoff: {
            discount: discount
          }
        };

        return this;
      },

      /**
            <p>Enables highlighting of suggestions</p>

            @member ejs.PhraseSuggester
            @param {String} preTag A tag used at highlight start.
            @param {String} postTag A tag used at the end of the highlight.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      highlight: function (preTag, postTag) {
        if (arguments.length === 0) {
          return suggest[name].phrase.highlight;
        }

        suggest[name].phrase.highlight = {
          pre_tag: preTag,
          post_tag: postTag
        };

        return this;
      },

      /**
            Adds a direct generator. If passed a single <code>Generator</code>
            it is added to the list of existing generators.  If passed an
            array of Generators, they replace all existing generators.

            @member ejs.PhraseSuggester
            @param {(Generator|Generator[])} oGenerator A valid Generator or
              array of Generator objects.
            @returns {Object} returns <code>this</code> so that calls can be chained.
            */
      directGenerator: function (oGenerator) {
        var i, len;

        if (suggest[name].phrase.direct_generator == null) {
          suggest[name].phrase.direct_generator = [];
        }

        if (oGenerator == null) {
          return suggest[name].phrase.direct_generator;
        }

        if (isGenerator(oGenerator)) {
          suggest[name].phrase.direct_generator.push(oGenerator.toJSON());
        } else if (isArray(oGenerator)) {
          suggest[name].phrase.direct_generator = [];
          for (i = 0, len = oGenerator.length; i < len; i++) {
            if (!isGenerator(oGenerator[i])) {
              throw new TypeError('Argument must be an array of Generators');
            }

            suggest[name].phrase.direct_generator.push(oGenerator[i].toJSON());
          }
        } else {
          throw new TypeError('Argument must be a Generator or array of Generators');
        }

        return this;
      }

    });
  };

  /**
    @class
    <p>TermSuggester suggests terms based on edit distance. The provided suggest 
    text is analyzed before terms are suggested. The suggested terms are 
    provided per analyzed suggest text token.  This leaves the suggest-selection 
    to the API consumer.  For a higher level suggester, please use the 
    <code>PhraseSuggester</code>.</p>

    @name ejs.TermSuggester
    @ejs suggest
    @borrows ejs.SuggesterMixin.text as text
    @borrows ejs.SuggesterMixin._type as _type
    @borrows ejs.SuggesterMixin.toJSON as toJSON
    @borrows ejs.DirectSettingsMixin.accuracy as accuracy
    @borrows ejs.DirectSettingsMixin.suggestMode as suggestMode
    @borrows ejs.DirectSettingsMixin.sort as sort
    @borrows ejs.DirectSettingsMixin.stringDistance as stringDistance
    @borrows ejs.DirectSettingsMixin.maxEdits as maxEdits
    @borrows ejs.DirectSettingsMixin.maxInspections as maxInspections
    @borrows ejs.DirectSettingsMixin.maxTermFreq as maxTermFreq
    @borrows ejs.DirectSettingsMixin.prefixLength as prefixLength
    @borrows ejs.DirectSettingsMixin.minWordLen as minWordLen
    @borrows ejs.DirectSettingsMixin.minDocFreq as minDocFreq
    @borrows ejs.SuggestContextMixin.analyzer as analyzer
    @borrows ejs.SuggestContextMixin.field as field
    @borrows ejs.SuggestContextMixin.size as size
    @borrows ejs.SuggestContextMixin.shardSize as shardSize

    @since elasticsearch 0.90
    
    @desc
    <p>A suggester that suggests terms based on edit distance.</p>

    @param {String} name The name which be used to refer to this suggester.
    */
  ejs.TermSuggester = function (name) {

    var
      _direct,
      _context,
      _common = ejs.SuggesterMixin(name),
      suggest = _common.toJSON();  
    
    suggest[name].term = {};
    _direct = ejs.DirectSettingsMixin(suggest[name].term);
    _context = ejs.SuggestContextMixin(suggest[name].term);

    return extend(_common, _direct, _context);
  };

  // run in noConflict mode
  ejs.noConflict = function () {
    root.ejs = _ejs;
    return this;
  };
  
}).call(this);
