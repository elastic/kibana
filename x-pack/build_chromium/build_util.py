import os, hashlib, platform, sys

# This file contains various utility functions used by the init and build scripts

def runcmdsilent(cmd):
  """Executes a string command in the shell"""
  print(' > ' + cmd)
  return os.system(cmd)

def runcmd(cmd):
  """Executes a string command in the shell"""
  print(' > ' + cmd)
  result = os.system(cmd)
  if result != 0:
    raise Exception(cmd + ' returned ' + str(result))

def mkdir(dir):
  print(' > mkdir -p ' + dir)
  """Makes a directory if it doesn't exist"""
  if not os.path.exists(dir):
    return os.makedirs(dir)

def sha1_file(filename):
  """Builds a hex sha1 hash of the given file"""
  sha1 = hashlib.sha1()
  with open(filename, 'rb') as f:
    for chunk in iter(lambda: f.read(128 * sha1.block_size), b''):
      sha1.update(chunk)
  return sha1.hexdigest()
