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

def md5_file(filename):
  """Builds a hex md5 hash of the given file"""
  md5 = hashlib.md5()
  with open(filename, 'rb') as f:
    for chunk in iter(lambda: f.read(128 * md5.block_size), b''):
      md5.update(chunk)
  return md5.hexdigest()
